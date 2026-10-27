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
  ResumoVendas,
  PaginaVendas,
  ItemVendido,
  Produto,
  EstoqueResumo,
  FormaPagamentoDim,
  Pessoa,
  Empresa,
  ContaPendente,
  Comissao,
} from '@/types'

export type { PaginaVendas }

export function getVendasPeriodo(inicio: string, fim: string, signal?: AbortSignal): Promise<Venda[]> {
  return apiGet<Venda[]>('/vendas', { inicio, fim }, signal)
}

export function getResumoVendas(
  inicio: string,
  fim: string,
  idsLojas: string,
  idCaixa: string,
  signal?: AbortSignal,
): Promise<ResumoVendas> {
  return apiGet<ResumoVendas>('/vendas/resumo', {
    inicio, fim, idsLojas, idCaixa: idCaixa === 'todos' ? undefined : idCaixa,
  }, signal)
}

export function getPaginaVendas(
  inicio: string,
  fim: string,
  page: number,
  pageSize: number,
  busca: string,
  sort: string,
  direcao: string,
  idsLojas: string,
  idCaixa: string,
): Promise<PaginaVendas> {
  return apiGet<PaginaVendas>('/vendas/pagina', {
    inicio, fim, page, pageSize, busca, sort, direcao, idsLojas,
    idCaixa: idCaixa === 'todos' ? undefined : idCaixa,
  })
}

export function getItensVendidosPeriodo(inicio: string, fim: string, signal?: AbortSignal, idsLojas = ''): Promise<ItemVendido[]> {
  return apiGet<ItemVendido[]>('/itens-vendidos', { inicio, fim, idsLojas }, signal)
}

export function getComissoes(inicio: string, fim: string, signal?: AbortSignal, idsLojas = ''): Promise<Comissao[]> {
  return apiGet<Comissao[]>('/comissoes', { inicio, fim, idsLojas }, signal)
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

export interface VendedorVendas {
  [key: string]: unknown
  codigo: string
  idLoja: string | null
  nome: string
  nomeLoja: string
  quantidadeVendas: number
  totalVendido: number
  ticketMedio?: number
}
export interface ResumoVendedores {
  items: VendedorVendas[]
  vendasAnalisadas: number
  vendasSemDetalhamento: number
  totalVendas: number
  valorSemDetalhamento: number
  totalAtribuido: number
  diferencaItens: number
}
export function getVendedoresVendas(inicio: string, fim: string, idsLojas: string, idCaixa: string, signal?: AbortSignal): Promise<ResumoVendedores> {
  return apiGet<ResumoVendedores>('/vendas/vendedores', { inicio, fim, idsLojas, idCaixa: idCaixa === 'todos' ? undefined : idCaixa }, signal)
}

export interface ContaPainelItem {
  [key: string]: unknown
  idDocumento: string
  numero: string
  nome: string
  descricao: string
  idLoja: string | null
  nomeLoja: string
  dtLancamento: string
  dtVencimento: string
  dtPagamento: string | null
  valOrigem: number
  valPago: number
  valDesconto: number
  valSaldo: number
  status: string
  situacao: 'VENCIDO' | 'A_VENCER' | 'LIQUIDADO'
  aindaPendente: boolean
}

export interface PainelContasResultado {
  kpis: {
    totalAberto: number
    totalVencido: number
    totalLiquidado: number
    totalGeral: number
    quantidadeAberto: number
    quantidadeVencido: number
    quantidadeLiquidado: number
    totalTitulos: number
  }
  fluxo: Array<{
    data: string
    aberto: number
    vencido: number
    liquidado: number
  }>
  items: ContaPainelItem[]
}

export function getPainelContasPagar(
  inicio?: string,
  fim?: string,
  idLoja?: string,
  signal?: AbortSignal,
): Promise<PainelContasResultado> {
  return apiGet<PainelContasResultado>(
    '/contas-a-pagar/painel',
    { inicio, fim, idLoja: idLoja === 'todas' ? undefined : idLoja },
    signal,
  )
}

export function getPainelContasReceber(
  inicio?: string,
  fim?: string,
  idLoja?: string,
  signal?: AbortSignal,
): Promise<PainelContasResultado> {
  return apiGet<PainelContasResultado>(
    '/contas-a-receber/painel',
    { inicio, fim, idLoja: idLoja === 'todas' ? undefined : idLoja },
    signal,
  )
}

export interface LinhaDre {
  [key: string]: unknown
  codigo: string
  descricao: string
  tipo: 'RECEITA' | 'DEDUCAO' | 'SUBTOTAL' | 'CUSTO' | 'DESPESA' | 'RESULTADO'
  destaque?: boolean
  valorAtual: number
  percentualVerticalAtual: number
  valorAnterior: number
  percentualVerticalAnterior: number
  variacaoNominal: number
  variacaoPercentual: number
}

export interface LinhaPlanoContas {
  [key: string]: unknown
  codigo?: string
  descricao: string
  valorAtual: number
  valorAnterior: number
  percentual: number
}

export interface EstruturaDreItem {
  rotulo: string
  tipo: 'RECEITA' | 'CUSTO' | 'DESPESA' | 'RESULTADO'
  valorAtual: number
  valorAnterior: number
  variacaoNominal: number
  variacaoPercentual: number
  percentualVerticalAtual: number
  percentualVerticalAnterior: number
  detalhes?: LinhaPlanoContas[]
}

export interface DreResultado {
  periodoAtual: { inicio: string; fim: string }
  periodoAnterior: { inicio: string; fim: string }
  kpis: {
    receitaLiquida: number
    lucroBruto: number
    margemBruta: number
    despesasOperacionais: number
    resultadoLiquido: number
    margemLiquida: number
  }
  estrutura?: {
    receita: EstruturaDreItem
    custos: EstruturaDreItem
    despesas: EstruturaDreItem
    resultadoLiquido: EstruturaDreItem
  }
  linhas: LinhaDre[]
  despesasDetalhadas?: LinhaPlanoContas[]
}

export function getDre(
  inicio: string,
  fim: string,
  inicioAnterior?: string,
  fimAnterior?: string,
  idsLojas?: string,
  signal?: AbortSignal,
): Promise<DreResultado> {
  return apiGet<DreResultado>(
    '/vendas/dre',
    {
      inicio,
      fim,
      inicioAnterior,
      fimAnterior,
      idsLojas,
    },
    signal,
  )
}

