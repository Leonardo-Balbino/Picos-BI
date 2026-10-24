import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { criarRedisServiceFake } from '../redis/redis-service.fake'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { ItensVendidosService } from './itens-vendidos.service'

describe('ItensVendidosService', () => {
  let service: ItensVendidosService
  let prisma: {
    itemVendidoDia: { upsert: jest.Mock; updateMany: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock }
    $transaction: jest.Mock
  }
  let upstream: { getAllPages: jest.Mock }

  beforeEach(async () => {
    prisma = {
      itemVendidoDia: { upsert: jest.fn(), updateMany: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.resolve(ops)),
    }
    upstream = { getAllPages: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        ItensVendidosService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: criarRedisServiceFake() },
        { provide: MeuErpOnlineClient, useValue: upstream },
        { provide: ConfigService, useValue: { get: () => 90 } },
      ],
    }).compile()

    service = moduleRef.get(ItensVendidosService)
  })

  it('chama o upstream uma vez por modelo de venda, sempre cobrindo o dia inteiro (DataFim exclusivo de 00:00:00 no upstream — precisa de hora explícita)', async () => {
    upstream.getAllPages.mockResolvedValue([])

    await service.sincronizarDia(new Date('2026-07-15T00:00:00.000Z'))

    expect(upstream.getAllPages).toHaveBeenCalledTimes(2)
    expect(upstream.getAllPages).toHaveBeenCalledWith(
      '/documento/mercadorias-vendidas/v1',
      { DataInicio: '2026-07-15T00:00:00', DataFim: '2026-07-15T23:59:59', Modelo: '65', limit: 100 },
      expect.any(Function),
      undefined,
    )
    expect(upstream.getAllPages).toHaveBeenCalledWith(
      '/documento/mercadorias-vendidas/v1',
      { DataInicio: '2026-07-15T00:00:00', DataFim: '2026-07-15T23:59:59', Modelo: 'PA', limit: 100 },
      expect.any(Function),
      undefined,
    )
  })

  it('soma qtd/valTotalLiquido do mesmo produto vindo de modelos diferentes antes de gravar', async () => {
    upstream.getAllPages
      .mockResolvedValueOnce([
        { idMercadoriaVariacao: 'P1', descricao: 'Produto 1', qtd: 2, valTotalLiquido: 20 },
      ])
      .mockResolvedValueOnce([
        { idMercadoriaVariacao: 'P1', descricao: 'Produto 1', qtd: 3, valTotalLiquido: 30 },
      ])

    await service.sincronizarDia(new Date('2026-07-15T00:00:00.000Z'))

    expect(prisma.itemVendidoDia.upsert).toHaveBeenCalledTimes(1)
    const chamada = prisma.itemVendidoDia.upsert.mock.calls[0][0]
    expect(chamada.create.qtd).toBe(5)
    expect(chamada.create.valTotalLiquido).toBe(50)
  })
  it('não altera buckets se a segunda consulta por modelo falha', async () => {
    upstream.getAllPages.mockResolvedValueOnce([{ idMercadoriaVariacao: 'P1', descricao: 'Item', qtd: 1, valTotalLiquido: 10 }]).mockRejectedValueOnce(new Error('timeout'))
    await expect(service.sincronizarDia(new Date('2026-09-26T00:00:00Z'), 'loja-inhuma')).rejects.toThrow('timeout')
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(prisma.itemVendidoDia.updateMany).not.toHaveBeenCalled()
  })
  it('zera agregados ausentes apenas no dia e loja reconciliados', async () => {
    upstream.getAllPages.mockResolvedValue([])
    await service.sincronizarDia(new Date('2026-09-26T00:00:00Z'), 'loja-inhuma')
    expect(prisma.itemVendidoDia.updateMany).toHaveBeenCalledWith({
      where: { idLoja: 'loja-inhuma', data: new Date('2026-09-26T00:00:00Z'), idMercadoriaVariacao: { notIn: [] } },
      data: { qtd: 0, valTotalLiquido: 0 },
    })
  })

})
