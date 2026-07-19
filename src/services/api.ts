/**
 * Cliente HTTP da API Pública Meu ERP Online — GET-only por construção (regra 1 do prompt
 * de edição v2): nenhuma função aqui aceita parâmetro de método, então não existe caminho
 * de código que monte um POST/PUT/PATCH/DELETE.
 *
 * Responsável por: header `Authorization: Authentication {token}`, fila serializada no ritmo
 * sustentado do rate limit documentado (seção "Documentação dos endpoints públicos" — 20
 * requisições iniciais, reposição de 20/min, fila de até 10 no servidor antes de 429), retry
 * com backoff exponencial em 429, logout automático em 401, cache em memória por sessão
 * (chave = path + params ordenados) e `fetchAllPages` para o envelope de paginação padrão da
 * API (`{page,limit,total,totalPages,hasNext,items}`).
 *
 * Decisão deliberada: não tenta consumir a rajada inicial de 20 mais rápido que o ritmo
 * sustentado — o gargalo real de uma tela é o tamanho da página (`limit`), não o espaçamento
 * entre requisições, e ficar sempre no ritmo sustentado evita o risco de estourar 429 perto
 * da borda da janela de reposição de 1 minuto.
 */
import { useUiStore } from '@/stores/useUiStore'

/** Reposição confirmada na documentação da API — mudar aqui se o rate limit publicado mudar. */
const REPOSICAO_POR_MINUTO = 20

/**
 * Callback de logout injetado em runtime (ver `main.ts`) em vez de importar `useAuthStore`
 * diretamente — evita um ciclo de import (authStore precisa de `limparCacheApi` no logout
 * manual, e este módulo precisaria do authStore para o logout automático em 401).
 */
let handleUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void): void {
  handleUnauthorized = fn
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Envelope<TRaw> {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  items: TRaw[]
}

export type QueryParams = Record<string, string | number | boolean | undefined>

const BASE_URL = import.meta.env.VITE_API_BASE_URL
const TOKEN = import.meta.env.VITE_API_TOKEN

const MIN_INTERVAL_MS = 60_000 / REPOSICAO_POR_MINUTO
const MAX_RETRIES = 3
const BACKOFF_MS = [30000, 60000, 120000]

const cache = new Map<string, unknown>()

let filaPromise: Promise<unknown> = Promise.resolve()
let ultimaRequisicao = 0

function montarUrl(path: string, params?: QueryParams): string {
  // Segundo parâmetro como base: cobre tanto VITE_API_BASE_URL absoluto (produção) quanto
  // relativo (dev, ex. `/publica`, resolvido pelo proxy do Vite) — sem base, `new URL()`
  // lança `TypeError: Invalid URL` para caminhos relativos e nenhuma requisição sai.
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== '') url.searchParams.set(chave, String(valor))
  }
  return url.toString()
}

function chaveCache(path: string, params?: QueryParams): string {
  const entradas = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== '')
  entradas.sort(([a], [b]) => a.localeCompare(b))
  return `${path}?${entradas.map(([k, v]) => `${k}=${v}`).join('&')}`
}

/**
 * Serializa todas as chamadas (1 por vez), respeitando um espaçamento mínimo entre elas.
 * Se `signal` já estiver cancelado quando chegar a vez da tarefa (ex.: o período mudou
 * enquanto ela esperava na fila atrás de outras páginas), nem chega a disparar o `fetch` —
 * só joga fora a posição na fila, sem gastar orçamento do rate limit com uma resposta que
 * ninguém mais vai usar.
 */
async function aguardarFila<T>(tarefa: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const proxima = filaPromise.then(async () => {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    const espera = MIN_INTERVAL_MS - (Date.now() - ultimaRequisicao)
    if (espera > 0) await new Promise((resolve) => setTimeout(resolve, espera))
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    ultimaRequisicao = Date.now()
    return tarefa()
  })
  filaPromise = proxima.then(
    () => undefined,
    () => undefined,
  )
  return proxima
}

async function requisitar(url: string, tentativa = 0, signal?: AbortSignal): Promise<Response> {
  const resposta = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Authentication ${TOKEN ?? ''}`,
    },
  })

  if (resposta.status === 401) {
    handleUnauthorized?.()
    limparCacheApi()
    useUiStore().toast({
      title: 'Sessão expirada',
      description: 'Faça login novamente para continuar.',
      variant: 'error',
    })
    throw new ApiError(401, 'Não autorizado')
  }

  if (resposta.status === 429) {
    if (tentativa >= MAX_RETRIES) {
      throw new ApiError(429, 'Limite de requisições excedido — tente novamente em alguns minutos')
    }
    useUiStore().toast({
      title: 'Aguardando a API liberar novas consultas…',
      variant: 'info',
    })
    await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[tentativa]))
    return requisitar(url, tentativa + 1, signal)
  }

  if (!resposta.ok) {
    throw new ApiError(resposta.status, `Erro ${resposta.status} ao consultar ${new URL(url).pathname}`)
  }

  return resposta
}

/** GET simples, com cache por sessão. Usado para dimensões (sem paginação). */
export async function apiGet<TRaw>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<TRaw> {
  const chave = chaveCache(path, params)
  if (cache.has(chave)) return cache.get(chave) as TRaw
  const url = montarUrl(path, params)
  const dados = await aguardarFila(async () => {
    const resposta = await requisitar(url, 0, signal)
    return (await resposta.json()) as TRaw
  }, signal)
  cache.set(chave, dados)
  return dados
}

/**
 * Pagina um endpoint que segue o envelope `{page,limit,total,totalPages,hasNext,items}`,
 * aplicando `mapItem` página a página (descarta o restante do payload bruto imediatamente —
 * importante para `documento/v1`, cujo item completo é pesado). Cacheia o resultado final
 * por sessão, por combinação de path+params (inclui o intervalo de datas quando presente).
 */
export async function fetchAllPages<TItem, TRaw = unknown>(
  path: string,
  params: QueryParams,
  mapItem: (raw: TRaw) => TItem,
  onProgress?: (pagina: number, totalPaginas: number) => void,
  signal?: AbortSignal,
): Promise<TItem[]> {
  const chaveBase = chaveCache(path, params)
  if (cache.has(chaveBase)) return cache.get(chaveBase) as TItem[]

  const limite = params.limit ?? 100
  const resultado: TItem[] = []
  let pagina = 1
  let totalPaginas = 1

  do {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    const url = montarUrl(path, { ...params, page: pagina, limit: limite })
    const envelope = await aguardarFila(async () => {
      const resposta = await requisitar(url, 0, signal)
      return (await resposta.json()) as Envelope<TRaw>
    }, signal)
    for (const item of envelope.items) resultado.push(mapItem(item))
    totalPaginas = envelope.totalPages || 1
    onProgress?.(pagina, totalPaginas)
    if (!envelope.hasNext) break
    pagina++
  } while (pagina <= totalPaginas)

  cache.set(chaveBase, resultado)
  return resultado
}

/** Limpa o cache em memória (usado no logout, para não vazar dados de uma empresa pra outra). */
export function limparCacheApi(): void {
  cache.clear()
}
