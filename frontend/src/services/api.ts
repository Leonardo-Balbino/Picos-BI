/**
 * Cliente HTTP do backend do PICOS Analytics (`../backend`) — não fala mais direto com a API
 * Meu ERP Online. O backend já sincroniza os dados em segundo plano e cacheia as leituras mais
 * pesadas (Redis). O navegador autentica com JWT e não precisa da chave de API do servidor.
 * Leituras GET iguais e simultâneas compartilham a mesma promessa.
 */
import { useUiStore } from '@/stores/useUiStore'

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

/** Envelope de paginação do backend — `{items, total, page, pageSize}`, diferente do envelope
 * original da API Meu ERP Online (`{page,limit,total,totalPages,hasNext,items}`). */
interface EnvelopePaginado<TRaw> {
  items: TRaw[]
  total: number
  page: number
  pageSize: number
}

export type QueryParams = Record<string, string | number | boolean | undefined>

const BASE_URL = import.meta.env.VITE_BACKEND_API_URL

const cache = new Map<string, unknown>()
const pendentes = new Map<string, Promise<unknown>>()
let geracaoCache = 0

function montarUrl(path: string, params?: QueryParams): string {
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

async function requisitar(url: string, signal?: AbortSignal): Promise<Response> {
  const token = sessionStorage.getItem('picos_token') || localStorage.getItem('picos_token')
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const resposta = await fetch(url, {
    method: 'GET',
    signal,
    headers,
  })

  if (resposta.status === 401) {
    handleUnauthorized?.()
    limparCacheApi()
    useUiStore().toast({
      title: 'Não foi possível autenticar com o servidor',
      description: 'Faça login novamente para continuar.',
      variant: 'error',
    })
    throw new ApiError(401, 'Não autorizado')
  }

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status} ao consultar ${new URL(url).pathname}`
    try {
      const corpo = (await resposta.json()) as { error?: { message?: string } }
      if (corpo.error?.message) mensagem = corpo.error.message
    } catch {
      // corpo não era JSON (ex.: backend fora do ar respondendo por um proxy) — mantém a
      // mensagem genérica acima em vez de quebrar tentando ler algo que não existe.
    }
    throw new ApiError(resposta.status, mensagem)
  }

  return resposta
}

/** GET com cache por sessão e compartilhamento de chamadas simultâneas. */
export async function apiGet<TRaw>(path: string, params?: QueryParams, signal?: AbortSignal): Promise<TRaw> {
  const chave = chaveCache(path, params)
  if (cache.has(chave)) return cache.get(chave) as TRaw
  if (!signal && pendentes.has(chave)) return pendentes.get(chave) as Promise<TRaw>

  const geracao = geracaoCache
  const pedido = (async () => {
    const resposta = await requisitar(montarUrl(path, params), signal)
    const dados = (await resposta.json()) as TRaw
    if (geracao === geracaoCache && !signal?.aborted) cache.set(chave, dados)
    return dados
  })()
  if (!signal) pendentes.set(chave, pedido)
  try {
    return await pedido
  } finally {
    if (pendentes.get(chave) === pedido) pendentes.delete(chave)
  }
}

/** Leitura de status em tempo real, sem reutilizar o cache da sessão. */
export async function apiGetAtual<T>(path: string, params?: QueryParams): Promise<T> {
  const resposta = await requisitar(montarUrl(path, params))
  return resposta.json() as Promise<T>
}

/**
 * Pagina um endpoint que segue o envelope `{items,total,page,pageSize}` do backend, juntando
 * todas as páginas num array só — os stores/páginas continuam recebendo a lista completa, como
 * já esperavam antes desta troca (o backend pagina por baixo pra impedir varredura completa da
 * tabela num único request, mas isso é um detalhe de implementação que o front não precisa ver).
 */
export async function fetchAllPages<TItem>(
  path: string,
  params: QueryParams,
  onProgress?: (pagina: number, totalPaginas: number) => void,
  signal?: AbortSignal,
): Promise<TItem[]> {
  const geracao = geracaoCache
  const chaveBase = chaveCache(path, params)
  if (cache.has(chaveBase)) return cache.get(chaveBase) as TItem[]

  const pageSize = params.pageSize ?? 100
  const resultado: TItem[] = []
  let page = 1
  let totalPaginas = 1

  do {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError')
    const url = montarUrl(path, { ...params, page, pageSize })
    const resposta = await requisitar(url, signal)
    const envelope = (await resposta.json()) as EnvelopePaginado<TItem>
    resultado.push(...envelope.items)
    totalPaginas = Math.max(1, Math.ceil(envelope.total / envelope.pageSize))
    onProgress?.(page, totalPaginas)
    page++
  } while (page <= totalPaginas)

  if (geracao === geracaoCache && !signal?.aborted) cache.set(chaveBase, resultado)
  return resultado
}

/** Limpa o cache em memória (usado no logout, para não vazar dados de uma empresa pra outra). */
export function limparCacheApi(): void {
  geracaoCache++
  cache.clear()
  pendentes.clear()
}

/** Executa requisições POST autenticadas (ex: /auth/login). */
export async function apiPost<TResponse, TBody = unknown>(path: string, body: TBody): Promise<TResponse> {
  const url = montarUrl(path)
  const token = sessionStorage.getItem('picos_token') || localStorage.getItem('picos_token')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const resposta = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status} na requisição`
    try {
      const corpo = (await resposta.json()) as { message?: string; error?: { message?: string } }
      if (corpo.message) mensagem = corpo.message
      else if (corpo.error?.message) mensagem = corpo.error.message
    } catch {
      // Ignora erro de parse
    }
    throw new ApiError(resposta.status, mensagem)
  }

  return (await resposta.json()) as TResponse
}

/** Executa requisições PUT autenticadas. */
export async function apiPut<TResponse, TBody = unknown>(path: string, body: TBody): Promise<TResponse> {
  const url = montarUrl(path)
  const token = sessionStorage.getItem('picos_token') || localStorage.getItem('picos_token')
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const resposta = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (!resposta.ok) {
    let mensagem = `Erro ${resposta.status} na requisição`
    try {
      const corpo = (await resposta.json()) as { message?: string; error?: { message?: string } }
      if (corpo.message) mensagem = corpo.message
      else if (corpo.error?.message) mensagem = corpo.error.message
    } catch {
      // Ignora erro de parse
    }
    throw new ApiError(resposta.status, mensagem)
  }

  return (await resposta.json()) as TResponse
}

