import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'

/**
 * Cache das leituras mais pesadas (agregação sobre a janela de 365 dias — vendas, itens
 * vendidos, comissões, resumo de estoque). O Postgres já é rápido pra isso, mas ele ainda
 * refaz a agregação a cada request; o Redis evita refazer o mesmo cálculo pra dois usuários (ou
 * dois filtros iguais) pedindo o mesmo período em sequência.
 *
 * Invalidação por **geração**, não por TTL curto nem por apagar chave por chave: cada entidade
 * tem um contador (`INCR`) que o `SyncService` avança assim que uma sincronização termina com
 * sucesso (`bumparGeracao`). A chave de cache embute a geração atual — quando ela avança, toda
 * chave da geração anterior fica simplesmente inalcançável (nunca mais lida, nunca precisa ser
 * apagada individualmente) e expira sozinha pelo TTL de segurança. Isso evita ter que conhecer,
 * no momento da sincronização, todas as combinações de filtro que algum client já cacheou.
 *
 * Falha aberta: se o Redis estiver fora do ar, `getOrSet` loga um aviso e chama `calcular()`
 * direto — o cache é uma otimização, não uma dependência dura; o BI continua respondendo (só
 * mais devagar) mesmo sem Redis.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private readonly client: Redis
  private readonly ttlPadrao: number

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')!
    this.ttlPadrao = this.config.get<number>('CACHE_TTL_SEGUNDOS')!

    this.client = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy: (tentativa) => Math.min(tentativa * 200, 2000),
    })
    this.client.on('error', (erro) => this.logger.warn(`Erro de conexão com Redis: ${erro.message}`))
  }

  onModuleDestroy(): void {
    this.client.disconnect()
  }

  /** Trava compartilhada por cron e CLI. Sem Redis, não inicia importação concorrente. */
  async executarSyncExclusivo<T>(tarefa: (verificar: () => void) => Promise<T>): Promise<T | undefined> {
    const chave = 'picos-bi:sync:lock'
    const dono = randomUUID()
    const adquirido = await this.client.set(chave, dono, 'EX', 180, 'NX')
    if (adquirido !== 'OK') return undefined
    let perdida = false
    const verificar = () => { if (perdida) throw new Error('Trava de sincronização perdida; ciclo interrompido.') }
    const timer = setInterval(() => {
      void this.client.eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('expire',KEYS[1],180) else return 0 end",
        1, chave, dono,
      ).then((ok) => { if (ok !== 1) perdida = true }).catch(() => { perdida = true })
    }, 30_000)
    timer.unref()
    try {
      return await tarefa(verificar)
    } finally {
      clearInterval(timer)
      await this.client.eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
        1, chave, dono,
      ).catch(() => this.logger.warn('Não foi possível liberar a trava; ela expirará automaticamente.'))
    }
  }

  /**
   * Cache-aside: tenta ler `chave`; em miss (ou se o Redis falhar), calcula via `calcular()` e
   * grava pro próximo pedido. Ver `chaveComGeracao` pra montar `chave` de forma que se
   * invalide sozinha quando a entidade sincronizar de novo.
   */
  async getOrSet<T>(chave: string, calcular: () => Promise<T>, ttlSegundos = this.ttlPadrao): Promise<T> {
    try {
      const emCache = await this.client.get(chave)
      if (emCache !== null) return JSON.parse(emCache) as T
    } catch (erro) {
      this.logger.warn(`Falha lendo cache (${chave}), calculando direto: ${(erro as Error).message}`)
    }

    const valor = await calcular()

    try {
      await this.client.set(chave, JSON.stringify(valor), 'EX', ttlSegundos)
    } catch (erro) {
      this.logger.warn(`Falha gravando cache (${chave}): ${(erro as Error).message}`)
    }

    return valor
  }

  /** Monta uma chave de cache que embute a geração atual da entidade — ver o comentário da
   * classe pra por que isso substitui invalidação manual por padrão de chave. */
  async chaveComGeracao(entidade: string, sufixo: string): Promise<string> {
    const geracao = await this.getGeracao(entidade)
    return `${entidade}:g${geracao}:${sufixo}`
  }

  async getGeracao(entidade: string): Promise<number> {
    try {
      const valor = await this.client.get(`geracao:${entidade}`)
      return valor ? Number(valor) : 0
    } catch (erro) {
      this.logger.warn(`Falha lendo geração de cache (${entidade}): ${(erro as Error).message}`)
      return 0
    }
  }

  /** Chamado pelo `SyncService` assim que uma sincronização de `entidade` termina com sucesso —
   * é o que invalida todo o cache daquela entidade de uma vez. */
  async bumparGeracao(entidade: string): Promise<void> {
    try {
      await this.client.incr(`geracao:${entidade}`)
    } catch (erro) {
      this.logger.warn(`Falha avançando geração de cache (${entidade}): ${(erro as Error).message}`)
    }
  }
}
