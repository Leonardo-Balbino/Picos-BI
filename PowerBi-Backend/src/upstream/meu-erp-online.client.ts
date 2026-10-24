import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Cliente HTTP da API Pública Meu ERP Online — porta server-side da mesma lógica já validada
 * em produção pelo front (`frontend/src/services/api.ts`), adaptada ao rodar aqui em vez de no
 * navegador: sem `toast` de UI, sem `AbortSignal` de navegação de tela, sem cache em memória
 * por sessão (cada chamada de sincronização é deliberada e única, não repetida por causa de
 * re-render de tela). Fila/backoff/paginação continuam idênticos — o rate limit é do servidor
 * do ERP, vale igual não importa quem chama.
 *
 * Contrato conhecido (não redescobrir, ver seção 1 do prompt de geração deste backend):
 * - Auth: header `Authorization: Authentication {token}` — o scheme literal é `Authentication`,
 *   não `Bearer`.
 * - Rate limit: 20 de rajada inicial, reposição de 20/min sustentado, fila de até 10 no
 *   servidor do ERP antes de `429`.
 * - Paginação: envelope `{page,limit,total,totalPages,hasNext,items}`, `limit=100` validado.
 */

const REPOSICAO_POR_MINUTO = 18
const MIN_INTERVAL_MS = Math.ceil(60_000 / REPOSICAO_POR_MINUTO) // ~3334ms por requisição para preservar a operação do cliente sem risco de 429
const MAX_RETRIES = 3
const BACKOFF_MS = [30_000, 60_000, 120_000]
const LIMIT_PADRAO = 100

export type QueryParams = Record<string, string | number | boolean | undefined>

interface EnvelopePaginado<TRaw> {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  items: TRaw[]
}

export class ErpApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ErpApiError'
  }
}

@Injectable()
export class MeuErpOnlineClient {
  private readonly logger = new Logger(MeuErpOnlineClient.name)
  private readonly baseUrl: string
  private readonly token: string

  // Fila serializada — uma promise que cada chamada nova encadeia atrás da anterior, respeitando
  // o espaçamento mínimo entre requisições. Estado de instância: como o client é singleton
  // (escopo default do Nest), todas as chamadas da aplicação passam pela mesma fila.
  private filaPromise: Promise<unknown> = Promise.resolve()
  private ultimaRequisicao = 0

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('ERP_API_BASE_URL')!
    this.token = this.config.get<string>('ERP_API_TOKEN')!
  }

  /** GET simples, sem paginação — usado pra `empresa/v1` e afins. Aceita token específico de loja. */
  async get<TRaw>(path: string, params?: QueryParams, token?: string): Promise<TRaw> {
    return this.aguardarFila(async () => {
      const resposta = await this.requisitar(this.montarUrl(path, params), 0, token)
      return (await resposta.json()) as TRaw
    })
  }

  /**
   * Pagina um endpoint que segue o envelope padrão, aplicando `mapItem` página a página.
   * Aceita token específico de loja.
   */
  async getAllPages<TItem, TRaw = unknown>(
    path: string,
    params: QueryParams,
    mapItem: (raw: TRaw) => TItem,
    token?: string,
  ): Promise<TItem[]> {
    const limite = params.limit ?? LIMIT_PADRAO
    const resultado: TItem[] = []
    let pagina = 1
    let totalPaginas = 1

    do {
      const url = this.montarUrl(path, { ...params, page: pagina, limit: limite })
      const envelope = await this.aguardarFila(async () => {
        const resposta = await this.requisitar(url, 0, token)
        return (await resposta.json()) as EnvelopePaginado<TRaw>
      })
      for (const item of envelope.items) resultado.push(mapItem(item))
      totalPaginas = envelope.totalPages || 1
      if (!envelope.hasNext) break
      pagina++
    } while (pagina <= totalPaginas)

    return resultado
  }

  private montarUrl(path: string, params?: QueryParams): string {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [chave, valor] of Object.entries(params ?? {})) {
      if (valor !== undefined && valor !== '') url.searchParams.set(chave, String(valor))
    }
    return url.toString()
  }

  /** Serializa todas as chamadas (1 por vez), respeitando o espaçamento mínimo sustentado. */
  private async aguardarFila<T>(tarefa: () => Promise<T>): Promise<T> {
    const proxima = this.filaPromise.then(async () => {
      const espera = MIN_INTERVAL_MS - (Date.now() - this.ultimaRequisicao)
      if (espera > 0) await new Promise((resolve) => setTimeout(resolve, espera))
      try {
        return await tarefa()
      } finally {
        this.ultimaRequisicao = Date.now()
      }
    })
    this.filaPromise = proxima.then(
      () => undefined,
      () => undefined,
    )
    return proxima
  }

  private async requisitar(url: string, tentativa = 0, tokenSobrescrito?: string): Promise<Response> {
    const tokenFinal = tokenSobrescrito || this.token
    const resposta = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Authentication ${tokenFinal}`,
      },
    })

    if (resposta.status === 401) {
      // Credencial inválida/expirada — falha com mensagem segura sem logar token
      this.logger.error(`401 da API Meu ERP Online em ${new URL(url).pathname} — credencial de acesso inválida ou expirada.`)
      throw new ErpApiError(401, 'Não autorizado pela API Meu ERP Online — token inválido ou expirado.')
    }

    if (resposta.status === 429) {
      if (tentativa >= MAX_RETRIES) {
        throw new ErpApiError(
          429,
          'Limite de requisições da API Meu ERP Online excedido — desistindo após retries.',
        )
      }
      const espera = BACKOFF_MS[tentativa]
      this.logger.warn(`429 em ${new URL(url).pathname} — aguardando ${espera}ms antes de tentar de novo.`)
      await new Promise((resolve) => setTimeout(resolve, espera))
      return this.requisitar(url, tentativa + 1, tokenSobrescrito)
    }

    if (!resposta.ok) {
      throw new ErpApiError(resposta.status, `Erro ${resposta.status} ao consultar ${new URL(url).pathname}.`)
    }

    return resposta
  }
}
