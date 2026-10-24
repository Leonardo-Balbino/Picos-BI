/**
 * Fake reaproveitável de `RedisService` pros testes unitários dos services que cacheiam leitura
 * (seção 11 do documento de padrões — helper de teste compartilhado, não duplicado em cada
 * spec). `getOrSet` chama `calcular()` direto, sem cache de verdade — os specs testam a lógica
 * de negócio, não o Redis, que já tem seu próprio teste em `redis.service.spec.ts`.
 */
export function criarRedisServiceFake() {
  return {
    executarSyncExclusivo: jest.fn((tarefa: (verificar: () => void) => Promise<unknown>) => tarefa(() => {})),
    getOrSet: jest.fn((_chave: string, calcular: () => Promise<unknown>) => calcular()),
    chaveComGeracao: jest.fn((entidade: string, sufixo: string) =>
      Promise.resolve(`${entidade}:g0:${sufixo}`),
    ),
    getGeracao: jest.fn().mockResolvedValue(0),
    bumparGeracao: jest.fn().mockResolvedValue(undefined),
  }
}
