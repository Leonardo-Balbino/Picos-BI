import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { RedisService } from './redis.service'

// Mocka o módulo `ioredis` inteiro — este spec testa a lógica de cache-aside/geração do
// `RedisService`, não o cliente Redis de verdade (isso é o `test/app.e2e-spec.ts`, que sobe
// contra um Redis real).
const clienteFake = {
  get: jest.fn(),
  eval: jest.fn().mockResolvedValue(1),
  set: jest.fn(),
  incr: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
}
jest.mock('ioredis', () => jest.fn().mockImplementation(() => clienteFake))

describe('RedisService', () => {
  let service: RedisService

  beforeEach(async () => {
    jest.clearAllMocks()

    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: { get: (chave: string) => (chave === 'REDIS_URL' ? 'redis://localhost:6379' : 3600) },
        },
      ],
    }).compile()

    service = moduleRef.get(RedisService)
  })

  describe('getOrSet', () => {
    it('em miss, calcula e grava no cache com o TTL configurado', async () => {
      clienteFake.get.mockResolvedValue(null)
      const calcular = jest.fn().mockResolvedValue({ total: 42 })

      const resultado = await service.getOrSet('chave-1', calcular)

      expect(resultado).toEqual({ total: 42 })
      expect(calcular).toHaveBeenCalledTimes(1)
      expect(clienteFake.set).toHaveBeenCalledWith('chave-1', JSON.stringify({ total: 42 }), 'EX', 3600)
    })

    it('em hit, devolve o valor cacheado sem chamar calcular()', async () => {
      clienteFake.get.mockResolvedValue(JSON.stringify({ total: 99 }))
      const calcular = jest.fn()

      const resultado = await service.getOrSet('chave-1', calcular)

      expect(resultado).toEqual({ total: 99 })
      expect(calcular).not.toHaveBeenCalled()
    })

    it('falha aberta: se o Redis der erro na leitura, calcula direto em vez de propagar o erro', async () => {
      clienteFake.get.mockRejectedValue(new Error('ECONNREFUSED'))
      const calcular = jest.fn().mockResolvedValue('valor-calculado')

      const resultado = await service.getOrSet('chave-1', calcular)

      expect(resultado).toBe('valor-calculado')
    })

    it('falha aberta: se o Redis der erro na escrita, ainda devolve o valor calculado', async () => {
      clienteFake.get.mockResolvedValue(null)
      clienteFake.set.mockRejectedValue(new Error('ECONNREFUSED'))

      const resultado = await service.getOrSet('chave-1', () => Promise.resolve('valor-calculado'))

      expect(resultado).toBe('valor-calculado')
    })
  })

  describe('trava de sincronização', () => {
    it('não executa se a trava já está ocupada', async () => {
      clienteFake.set.mockResolvedValue(null)
      const tarefa = jest.fn()
      await expect(service.executarSyncExclusivo(tarefa)).resolves.toBeUndefined()
      expect(tarefa).not.toHaveBeenCalled()
    })
    it('falha fechada: Redis indisponível não permite iniciar importação', async () => {
      clienteFake.set.mockRejectedValue(new Error('Redis indisponível'))
      const tarefa = jest.fn()
      await expect(service.executarSyncExclusivo(tarefa)).rejects.toThrow('Redis indisponível')
      expect(tarefa).not.toHaveBeenCalled()
    })
    it('libera somente a trava do proprietário mesmo quando a tarefa falha', async () => {
      clienteFake.set.mockResolvedValue('OK')
      clienteFake.eval.mockResolvedValue(1)
      await expect(service.executarSyncExclusivo(async () => { throw new Error('Falhou') })).rejects.toThrow('Falhou')
      const dono = clienteFake.set.mock.calls[0][1]
      expect(clienteFake.eval).toHaveBeenCalledWith(expect.stringContaining("redis.call('del'"), 1, 'picos-bi:sync:lock', dono)
    })
  })

  describe('geração', () => {
    it('getGeracao devolve 0 quando a entidade nunca teve a geração avançada', async () => {
      clienteFake.get.mockResolvedValue(null)

      expect(await service.getGeracao('venda')).toBe(0)
    })

    it('bumparGeracao incrementa o contador da entidade certa', async () => {
      await service.bumparGeracao('venda')

      expect(clienteFake.incr).toHaveBeenCalledWith('geracao:venda')
    })

    it('chaveComGeracao embute a geração atual da entidade na chave', async () => {
      clienteFake.get.mockResolvedValue('3')

      const chave = await service.chaveComGeracao('venda', '2026-01-01:2026-01-31:todos')

      expect(chave).toBe('venda:g3:2026-01-01:2026-01-31:todos')
    })
  })
})
