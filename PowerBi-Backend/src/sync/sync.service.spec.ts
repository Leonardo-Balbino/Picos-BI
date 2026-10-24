import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { criarRedisServiceFake } from '../redis/redis-service.fake'
import { VendasService } from '../vendas/vendas.service'
import { ItensVendidosService } from '../itens-vendidos/itens-vendidos.service'
import { ComissoesService } from '../comissoes/comissoes.service'
import { ProdutosService } from '../produtos/produtos.service'
import { ClientesService } from '../clientes/clientes.service'
import { FormasPagamentoService } from '../formas-pagamento/formas-pagamento.service'
import { EstoqueService } from '../estoque/estoque.service'
import { EmpresaService } from '../empresa/empresa.service'
import { ContasPendentesService } from '../contas-pendentes/contas-pendentes.service'
import { ErpApiError } from '../upstream/meu-erp-online.client'
import { SyncService } from './sync.service'
import { CronJob } from 'cron'
import { SCHEDULE_CRON_OPTIONS } from '@nestjs/schedule/dist/schedule.constants'

describe('SyncService', () => {
  let service: SyncService
  let prisma: {
    syncLog: { findMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock }
    loja: { findMany: jest.Mock }
  }
  let redis: ReturnType<typeof criarRedisServiceFake>
  let vendasService: { sincronizarDia: jest.Mock; expirarAntesDe: jest.Mock }
  let itensVendidosService: { sincronizarDia: jest.Mock; expirarAntesDe: jest.Mock }
  let comissoesService: { sincronizarDia: jest.Mock; expirarAntesDe: jest.Mock }

  // `hojeUtc()` não é injetável por design (é uma função pura de tempo real, não um parâmetro
  // do serviço) — os testes usam uma janela pequena (5 dias) só pra manter o número de dias
  // esperado em cada asserção previsível e barato de calcular, sem precisar mockar o relógio.
  const JANELA_TESTE = 5

  beforeEach(async () => {
    prisma = {
      syncLog: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), findFirst: jest.fn() },
      loja: { findMany: jest.fn().mockResolvedValue([]) },
    }
    redis = criarRedisServiceFake()
    vendasService = {
      sincronizarDia: jest.fn().mockResolvedValue(1),
      expirarAntesDe: jest.fn().mockResolvedValue(0),
    }
    itensVendidosService = {
      sincronizarDia: jest.fn().mockResolvedValue(1),
      expirarAntesDe: jest.fn().mockResolvedValue(0),
    }
    comissoesService = {
      sincronizarDia: jest.fn().mockResolvedValue(1),
      expirarAntesDe: jest.fn().mockResolvedValue(0),
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'ERP_API_TOKEN' ? 'token-teste' : JANELA_TESTE) },
        },
        { provide: VendasService, useValue: vendasService },
        { provide: ItensVendidosService, useValue: itensVendidosService },
        { provide: ComissoesService, useValue: comissoesService },
        { provide: ProdutosService, useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) } },
        { provide: ClientesService, useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) } },
        {
          provide: FormasPagamentoService,
          useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) },
        },
        { provide: EstoqueService, useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) } },
        { provide: EmpresaService, useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) } },
        {
          provide: ContasPendentesService,
          useValue: { sincronizarSnapshot: jest.fn().mockResolvedValue(0) },
        },
      ],
    }).compile()

    service = moduleRef.get(SyncService)
  })

  it('sincroniza todo dia da janela quando não há nenhum SyncLog de sucesso ainda', async () => {
    await service.sincronizarJanela()

    // janela de 5 dias = 5 chamadas de sincronizarDia por entidade (dias -5..-1 a partir de hoje).
    expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE)
    expect(vendasService.expirarAntesDe).toHaveBeenCalledTimes(1)
  })

  it('pula dias que já têm SyncLog de sucesso (idempotência do backfill)', async () => {
    // Simula que só o dia mais antigo da janela já foi sincronizado com sucesso.
    prisma.syncLog.findMany.mockImplementation(({ where }: { where: { entidade: string } }) => {
      if (where.entidade === 'VENDA') {
        const hoje = new Date()
        const diaMaisAntigo = new Date(hoje.getTime() - JANELA_TESTE * 86_400_000)
        return Promise.resolve([{ dataReferencia: diaMaisAntigo }])
      }
      return Promise.resolve([])
    })

    await service.sincronizarJanela()

    // 1 dia a menos pra VENDA (já coberto), os outros continuam pedindo a janela inteira.
    expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE - 1)
    expect(itensVendidosService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE)
  })

  it('uma entidade falhando não impede as outras de sincronizar, e grava SyncLog de erro', async () => {
    jest.useFakeTimers()
    vendasService.sincronizarDia.mockRejectedValue(new Error('ERP fora do ar'))

    const execucao = service.sincronizarJanela()
    await jest.runAllTimersAsync()
    await execucao
    jest.useRealTimers()

    expect(itensVendidosService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE)
    expect(comissoesService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE)

    const chamadasDeErro = prisma.syncLog.create.mock.calls.filter(
      ([args]: [{ data: { entidade: string; status: string } }]) =>
        args.data.entidade === 'VENDA' && args.data.status === 'ERRO',
    )
    expect(chamadasDeErro).toHaveLength(JANELA_TESTE)
  })

  it('tenta de novo um dia que falhou antes de desistir e gravar erro (falha transitória)', async () => {
    jest.useFakeTimers()
    // Falha nas duas primeiras tentativas do primeiro dia, depois começa a dar certo — simula um
    // hiccup transitório (rede, 5xx) que se resolve sozinho antes de esgotar as tentativas.
    vendasService.sincronizarDia
      .mockRejectedValueOnce(new Error('timeout'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue(1)

    const execucao = service.sincronizarJanela()
    await jest.runAllTimersAsync()
    await execucao
    jest.useRealTimers()

    // 2 tentativas fracassadas + 1 bem-sucedida pro primeiro dia, mais 1 chamada por dia
    // seguinte (já sem falha) = (JANELA_TESTE - 1) + 3.
    expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE - 1 + 3)
    const chamadasDeErro = prisma.syncLog.create.mock.calls.filter(
      ([args]: [{ data: { entidade: string; status: string } }]) =>
        args.data.entidade === 'VENDA' && args.data.status === 'ERRO',
    )
    expect(chamadasDeErro).toHaveLength(0)
  })

  it('não tenta de novo em 401 (token inválido não é transitório)', async () => {
    vendasService.sincronizarDia.mockRejectedValue(new ErpApiError(401, 'Não autorizado'))

    await service.sincronizarJanela()

    // Uma chamada por dia, sem retry nenhum — 401 propaga na primeira falha.
    expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(JANELA_TESTE)
  })

  it('avança a geração de cache da entidade a cada dia sincronizado com sucesso', async () => {
    await service.sincronizarJanela()

    expect(redis.bumparGeracao).toHaveBeenCalledWith('venda')
    expect(redis.bumparGeracao).toHaveBeenCalledTimes(JANELA_TESTE * 3) // VENDA + ITEM_VENDIDO + COMISSAO
  })

  it('não avança geração de cache pra um dia que falhou', async () => {
    jest.useFakeTimers()
    vendasService.sincronizarDia.mockRejectedValue(new Error('ERP fora do ar'))

    const execucao = service.sincronizarJanela()
    await jest.runAllTimersAsync()
    await execucao
    jest.useRealTimers()

    expect(redis.bumparGeracao).not.toHaveBeenCalledWith('venda')
  })

  it('expiração de uma entidade falhando não impede a expiração das outras', async () => {
    vendasService.expirarAntesDe.mockRejectedValue(new Error('timeout no banco'))

    await expect(service.sincronizarJanela()).resolves.not.toThrow()

    expect(itensVendidosService.expirarAntesDe).toHaveBeenCalledTimes(1)
    expect(comissoesService.expirarAntesDe).toHaveBeenCalledTimes(1)
  })

  describe('ciclo intradiário', () => {
    beforeEach(() => {
      prisma.loja.findMany.mockResolvedValue([{ id: 'loja-inhuma', codigo: 'inhuma', nome: 'Inhuma', erpToken: null }])
    })
    it('atualiza o dia atual novamente mesmo com logs de sucesso anteriores', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-27T01:30:00Z'))
      try {
        prisma.syncLog.findMany.mockResolvedValue([{ dataReferencia: new Date('2026-09-26T00:00:00Z') }])
        await service.executarCicloIntradiario()
        await service.executarCicloIntradiario()
        expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(2)
        expect(vendasService.sincronizarDia).toHaveBeenLastCalledWith(new Date('2026-09-26T00:00:00Z'), 'loja-inhuma', 'token-teste')
        expect(prisma.syncLog.findMany).not.toHaveBeenCalled()
        expect(vendasService.expirarAntesDe).not.toHaveBeenCalled()
        expect(redis.bumparGeracao).toHaveBeenCalledWith('venda')
      } finally { jest.useRealTimers() }
    })
    it('não importa quando outro processo mantém a trava', async () => {
      redis.executarSyncExclusivo.mockResolvedValueOnce(undefined)
      await service.executarCicloIntradiario()
      expect(vendasService.sincronizarDia).not.toHaveBeenCalled()
    })
    it('não usa a credencial de Inhuma para uma loja sem token', async () => {
      prisma.loja.findMany.mockResolvedValue([{ id: 'outra', codigo: 'outra', nome: 'Outra', erpToken: null }])
      await service.executarCicloIntradiario()
      expect(vendasService.sincronizarDia).not.toHaveBeenCalled()
    })
    it('status respeita as lojas autorizadas e não retorna o erro interno do ERP', async () => {
      prisma.loja.findMany.mockResolvedValue([])
      const resultado = await service.atualizacao(['loja-proibida'], { sub: 'u', nome: 'u', email: 'u@test', perfil: 'FRANQUEADO', lojas: ['loja-inhuma'] })
      expect(prisma.loja.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ativo: true, id: { in: [] } } }))
      expect(resultado.unidades).toEqual([])
    })
    it('reconcilia ontem mesmo que já tenha sido sincronizado parcialmente durante o dia', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-26T06:05:00Z'))
      try {
        prisma.syncLog.findMany.mockResolvedValue(Array.from({ length: 5 }, (_, i) => ({ dataReferencia: new Date(Date.UTC(2026, 8, 25 - i)) })))
        await service.executarCicloDiario()
        await service.executarCicloDiario()
        expect(vendasService.sincronizarDia).toHaveBeenCalledTimes(1)
        expect(vendasService.sincronizarDia).toHaveBeenCalledWith(new Date('2026-09-25T00:00:00Z'), 'loja-inhuma', 'token-teste')
      } finally { jest.useRealTimers() }
    })
  })

  describe('atualização operacional', () => {
    it('agenda estoque e receber a cada dez minutos, separados do ciclo de vendas', () => {
      const opcoes = Reflect.getMetadata(SCHEDULE_CRON_OPTIONS, service.executarCicloEstoqueReceber)
      const job = new CronJob(opcoes.cronTime, () => {}, null, false, opcoes.timeZone)
      const primeira = job.cronTime.getNextDateFrom(new Date('2026-10-09T14:06:00Z'), opcoes.timeZone)
      const segunda = job.cronTime.getNextDateFrom(primeira, opcoes.timeZone)
      expect(primeira.toISO()).toBe('2026-10-09T11:15:00.000-03:00')
      expect(segunda.diff(primeira, 'minutes').minutes).toBe(10)
      expect(primeira.minute % 10).toBe(5)
    })

    it('atualiza apenas os quatro snapshots e preserva vendas/histórico', async () => {
      prisma.loja.findMany.mockResolvedValue([{ id: 'loja-inhuma', codigo: 'inhuma', nome: 'Inhuma', erpToken: null }])
      const resultado = await service.sincronizarOperacional()
      expect(resultado?.totalSucessos).toBe(4)
      expect(vendasService.sincronizarDia).not.toHaveBeenCalled()
      const entidades = prisma.syncLog.create.mock.calls.map(([args]) => args.data.entidade)
      expect(entidades).toEqual(['PRODUTO', 'PESSOA', 'ESTOQUE', 'CONTA_RECEBER'])
    })
    it('não inicia novas chamadas quando a sincronização já está ocupada', async () => {
      redis.executarSyncExclusivo.mockResolvedValueOnce(undefined)
      expect(await service.sincronizarOperacional()).toBeUndefined()
      expect(prisma.syncLog.create).not.toHaveBeenCalled()
    })
  })

  describe('status', () => {
    it('reporta "Nunca sincronizado." pra uma entidade sem nenhum SyncLog', async () => {
      prisma.syncLog.findFirst.mockResolvedValue(null)

      const resultado = await service.status()

      expect(resultado.entidades.length).toBeGreaterThan(0)
      for (const item of resultado.entidades) {
        expect(item.erro).toBe('Nunca sincronizado.')
      }
    })
  })
})
