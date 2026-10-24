import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { criarRedisServiceFake } from '../redis/redis-service.fake'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { ComissoesService } from './comissoes.service'

describe('ComissoesService', () => {
  let service: ComissoesService
  let prisma: { comissaoDia: { upsert: jest.Mock; updateMany: jest.Mock }; $transaction: jest.Mock }
  let upstream: { getAllPages: jest.Mock }

  beforeEach(async () => {
    prisma = {
      comissaoDia: { upsert: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) => Promise.resolve(ops)),
    }
    upstream = { getAllPages: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        ComissoesService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: criarRedisServiceFake() },
        { provide: MeuErpOnlineClient, useValue: upstream },
        { provide: ConfigService, useValue: { get: () => 90 } },
      ],
    }).compile()

    service = moduleRef.get(ComissoesService)
  })

  it('soma valTotalLiquido/valTotalComissao de todos os documentos do mesmo funcionário no dia, em vez de sobrescrever (bug corrigido: a API devolve um item por documento, não por funcionário)', async () => {
    upstream.getAllPages.mockResolvedValue([
      { nomeFuncionario: 'GIRLAN MARCOS', valTotalLiquido: 10, valTotalComissao: 1.5 },
      { nomeFuncionario: 'GIRLAN MARCOS', valTotalLiquido: 80, valTotalComissao: 32 },
      { nomeFuncionario: 'NETYNHO CORTEZ', valTotalLiquido: 20, valTotalComissao: 4 },
    ])

    const registrados = await service.sincronizarDia(new Date('2026-08-05T00:00:00.000Z'))

    // 3 documentos crus, 2 funcionários distintos — retorna a contagem pós-agregação.
    expect(registrados).toBe(2)
    expect(prisma.comissaoDia.upsert).toHaveBeenCalledTimes(2)

    const porFuncionario = new Map(
      prisma.comissaoDia.upsert.mock.calls.map(([args]) => [args.create.nomeFuncionario, args.create]),
    )
    expect(porFuncionario.get('GIRLAN MARCOS')).toMatchObject({ valTotalLiquido: 90, valTotalComissao: 33.5 })
    expect(porFuncionario.get('NETYNHO CORTEZ')).toMatchObject({ valTotalLiquido: 20, valTotalComissao: 4 })
  })

  it('zera apenas os totais derivados da loja e dia quando a resposta completa não contém comissões', async () => {
    upstream.getAllPages.mockResolvedValue([])

    const registrados = await service.sincronizarDia(new Date('2026-08-05T00:00:00.000Z'))

    expect(registrados).toBe(0)
    expect(prisma.comissaoDia.upsert).not.toHaveBeenCalled()
    expect(prisma.comissaoDia.updateMany).toHaveBeenCalledWith({
      where: { idLoja: 'loja-inhuma', data: new Date('2026-08-05T00:00:00.000Z'), nomeFuncionario: { notIn: [] } },
      data: { valTotalLiquido: 0, valTotalComissao: 0 },
    })
  })
  it('preserva totais anteriores quando o ERP falha', async () => {
    upstream.getAllPages.mockRejectedValue(new Error('timeout'))
    await expect(service.sincronizarDia(new Date('2026-08-05T00:00:00Z'), 'loja-inhuma')).rejects.toThrow('timeout')
    expect(prisma.comissaoDia.updateMany).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

})
