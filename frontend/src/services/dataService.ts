/**
 * Uma função por endpoint do backend do PICOS Analytics (`../backend`). Diferente da versão
 * anterior (que falava direto com a API Meu ERP Online), aqui não tem mais parse defensivo
 * campo-a-campo nem casing de query param pra lembrar — o backend já devolve os tipos prontos
 * (contrato documentado em `backend/README.md`, seção "Contrato com o front"), então essas
 * funções só existem pra dar um nome de domínio a cada chamada, não pra transformar payload.
 */
import { apiGet, fetchAllPages } from './api'
import type {
  Venda,
  ItemVendido,
  Produto,
  EstoqueResumo,
  FormaPagamentoDim,
  Pessoa,
  Empresa,
  ContaPendente,
  Comissao,
} from '@/types'

export function getVendasPeriodo(inicio: string, fim: string, signal?: AbortSignal): Promise<Venda[]> {
  return apiGet<Venda[]>('/vendas', { inicio, fim }, signal)
}

export function getItensVendidosPeriodo(
  inicio: string,
  fim: string,
  signal?: AbortSignal,
  idLoja?: string,
): Promise<ItemVendido[]> {
  return apiGet<ItemVendido[]>('/itens-vendidos', { inicio, fim, idLoja }, signal)
}

export function getComissoes(inicio: string, fim: string, signal?: AbortSignal): Promise<Comissao[]> {
  return apiGet<Comissao[]>('/comissoes', { inicio, fim }, signal)
}

export function getCatalogoProdutos(onProgress?: (pagina: number, totalPaginas: number) => void): Promise<Produto[]> {
  return fetchAllPages<Produto>('/produtos', {}, onProgress)
}

export function getPessoas(onProgress?: (pagina: number, totalPaginas: number) => void): Promise<Pessoa[]> {
  return fetchAllPages<Pessoa>('/clientes', {}, onProgress)
}

export function getFormasPagamento(): Promise<FormaPagamentoDim[]> {
  return apiGet<FormaPagamentoDim[]>('/formas-pagamento')
}

/** Substitui o antigo par `getLocaisEstoque` + `getSaldoEstoqueLocal` (uma chamada por local) —
 * o backend já soma o saldo de todos os locais ativos num único request. */
export function getEstoqueResumo(): Promise<EstoqueResumo> {
  return apiGet<EstoqueResumo>('/estoque/resumo')
}

export function getEmpresa(): Promise<Empresa> {
  return apiGet<Empresa>('/empresa')
}

export function getContasReceberPendentes(inicio: string, fim: string, signal?: AbortSignal): Promise<ContaPendente[]> {
  return apiGet<ContaPendente[]>('/contas-a-receber', { inicio, fim }, signal)
}

export function getContasPagarPendentes(inicio: string, fim: string, signal?: AbortSignal): Promise<ContaPendente[]> {
  return apiGet<ContaPendente[]>('/contas-a-pagar', { inicio, fim }, signal)
}
