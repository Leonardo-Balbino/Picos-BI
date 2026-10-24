import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { UnprocessableEntityException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { VendasService } from './vendas.service'
import { criarRedisServiceFake } from '../redis/redis-service.fake'

describe('VendasService', () => {
  let service: VendasService
  let prisma: {
    venda: { findMany: jest.Mock; upsert: jest.Mock; deleteMany: jest.Mock }
    $transaction: jest.Mock
  }
  let upstream: { getAllPages: jest.Mock }

  beforeEach(async () => {
    prisma = {
      venda: { findMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.resolve(ops)),
    }
    upstream = { getAllPages: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        VendasService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: criarRedisServiceFake() },
        { provide: MeuErpOnlineClient, useValue: upstream },
        { provide: ConfigService, useValue: { get: () => 90 } },
      ],
    }).compile()

    service = moduleRef.get(VendasService)
  })

  describe('listarPeriodo', () => {
    it('rejeita um intervalo mais largo que a janela mantida', async () => {
      await expect(service.listarPeriodo('2026-01-01', '2026-07-01')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      )
      expect(prisma.venda.findMany).not.toHaveBeenCalled()
    })

    it('filtra vendas canceladas/estornadas mesmo que passem no filtro estrutural do SQL', async () => {
      prisma.venda.findMany.mockResolvedValue([
        linhaVenda({ codigo: '1', statusDescricao: 'Emitido' }),
        linhaVenda({ codigo: '2', statusDescricao: 'Cancelado' }),
        linhaVenda({ codigo: '3', statusDescricao: 'Estornado' }),
      ])

      const resultado = await service.listarPeriodo(dataRecente(2), dataRecente(0))

      expect(resultado.map((v) => v.codigo)).toEqual(['1'])
    })

    it('converte Decimal do Prisma para number puro na resposta', async () => {
      prisma.venda.findMany.mockResolvedValue([linhaVenda({ codigo: '1', valTotal: '123.45' })])

      const [venda] = await service.listarPeriodo(dataRecente(1), dataRecente(0))

      expect(venda.valTotal).toBe(123.45)
      expect(typeof venda.valTotal).toBe('number')
    })
  })

  describe('listarPagina', () => {
    it('exclui pré-vendas e recebimentos sem valor antes de paginar e contar, preservando vendas a prazo', async () => {
      prisma.venda.findMany.mockResolvedValue([
        linhaVenda({ codigo: 'venda-prazo', modelo: 'PA', pagamentos: [] }),
        linhaVenda({ codigo: 'nf', modelo: '65' }),
        linhaVenda({ codigo: 'pre-venda', modelo: 'PV', valTotal: 120 }),
        linhaVenda({ codigo: 'pedido-aberto', modelo: 'PP', valTotal: 80 }),
        linhaVenda({ codigo: 'recebimento', modelo: 'TR', valTotal: 0 }),
        linhaVenda({ codigo: 'recebimento-positivo', modelo: 'TR', valTotal: 100 }),
        linhaVenda({ codigo: 'zerado', modelo: 'PA', valTotal: 0 }),
      ])
      const resultado = await service.listarPagina(dataRecente(1), dataRecente(0), 1, 1)
      expect(resultado.total).toBe(2)
      expect(resultado.items).toHaveLength(1)
      expect(resultado.items[0].codigo).toBe('venda-prazo')
    })

    it('preserva recebimentos na fonte do resumo financeiro, sem apagá-los do banco', async () => {
      prisma.venda.findMany.mockResolvedValue([
        linhaVenda({ codigo: 'recebimento', modelo: 'TR', valTotal: 0,
          pagamentos: [{ idPagamento: '1', descricao: 'Dinheiro', valor: 30 }] }),
      ])
      const resultado = await service.listarPeriodo(dataRecente(1), dataRecente(0))
      expect(resultado[0].pagamentos[0].valor).toBe(30)
      expect(prisma.venda.deleteMany).not.toHaveBeenCalled()
    })
  })

  describe('sincronizarDia', () => {
    it('consulta o upstream com DataInicio/DataFim cobrindo o dia pedido inteiro (DataFim é exclusivo de 00:00:00 no upstream — precisa de hora explícita)', async () => {
      upstream.getAllPages.mockResolvedValue([])

      await service.sincronizarDia(new Date('2026-07-15T00:00:00.000Z'))

      expect(upstream.getAllPages).toHaveBeenCalledWith(
        '/documento/v1',
        { DataInicio: '2026-07-15T00:00:00', DataFim: '2026-07-15T23:59:59', limit: 100 },
        expect.any(Function),
        undefined,
      )
    })

    it('não abre transação quando o dia não tem nenhum documento', async () => {
      upstream.getAllPages.mockResolvedValue([])

      await service.sincronizarDia(new Date('2026-07-15T00:00:00.000Z'))

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  function dataRecente(diasAtras: number): string {
    const hoje = new Date()
    hoje.setUTCDate(hoje.getUTCDate() - diasAtras)
    return hoje.toISOString().slice(0, 10)
  }

  function linhaVenda(overrides: Partial<Record<string, unknown>>) {
    return {
      codigo: '1',
      numero: '100',
      serie: '1',
      modelo: '65',
      modeloDescricao: 'NFC-e',
      dataHora: '2026-07-19T10:00:00',
      dataHoraMovimento: '2026-07-19T10:00:00',
      idCaixa: '1',
      valTotal: '50.00',
      tipoMovimento: 'S',
      tipoMovimentoDescricao: 'Saída',
      tipoMovimentoFinanceiro: 'R',
      status: 'E',
      statusDescricao: 'Emitido',
      nomeUsuario: 'Operador',
      pagamentos: [],
      ...overrides,
    }
  }
})
