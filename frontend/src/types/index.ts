// Tipos de domínio alinhados ao contrato REST do backend do PICOS Analytics (`../backend`),
// que por sua vez sincroniza da API Pública Meu ERP Online e devolve isso já normalizado —
// nomes de campo pt-BR herdados do ERP, mas os tipos e a formatação (boolean de verdade, datas
// YYYY-MM-DD, valores numéricos) já vêm prontos, sem mais precisar de parse defensivo aqui.

/** Forma de pagamento embutida numa venda. */
export interface PagamentoDocumento {
  idPagamento: string
  descricao: string
  valor: number
}

/** `GET /vendas` — fato de vendas (um cupom/nota por linha), já filtrado a só vendas válidas. */
export interface Venda {
  codigo: string
  numero: string
  serie: string
  modelo: string
  modeloDescricao: string
  dataHora: string
  dataHoraMovimento: string
  idCaixa: string
  idLoja?: string
  nomeLoja?: string
  custoTotal?: number
  valTotal: number | null
  tipoMovimento: string
  tipoMovimentoDescricao: string
  tipoMovimentoFinanceiro: string
  status: string
  statusDescricao: string
  nomeUsuario: string
  pagamentos: PagamentoDocumento[]
}

export interface ResumoVendas {
  idsCaixa: string[]
  idsLojasPresentes: string[]
  kpisGerais: {
    totalPeriodo: number
    custoTotal: number | null
    lucroBruto: number | null
    margemLucro: number | null
    vendasSemCusto: number
    ticketMedio: number
    cmvPercentual: number | null
    numeroVendas: number
    vendasHoje: number
    isCustoEstimado: boolean
  }
  serieTemporal: Record<string, number>
  porDiaSemana: number[]
  porHora: number[]
  porPDV: Array<{ idCaixa: string; total: number }>
  pagamentos: Array<{ idPagamento: string; valor: number; nTransacoes: number }>
  comparativo: Array<{ idLoja: string; faturamento: number; numeroVendas: number }>
}

export interface PaginaVendas {
  items: Venda[]
  total: number
  page: number
  pageSize: number
}

/** `GET /itens-vendidos` — item vendido, já somado pelo backend dentro do período pedido. */
export interface ItemVendido {
  idMercadoriaVariacao: string
  descricao: string
  qtd: number
  valTotalLiquido: number
}

/** `GET /produtos` (paginado) — catálogo, sem preço nem saldo por item. */
export interface Produto {
  [key: string]: unknown
  codigoMercadoriaVariacao: string
  descricao: string
  codigoBarras: string
  referenciaMercadoria: string
  embalagem: string
  idMarca: string
  qtdEstoqueMinimo: number
  qtdEstoqueMaximo: number
  ativo: boolean
}

/** `GET /estoque/resumo` — total agregado + locais, num único request (o backend já soma os
 * saldos de todos os locais ativos, o front não precisa mais buscar local por local). */
export interface LocalEstoqueResumo {
  codigo: string
  descricao: string
  ativo: boolean
}
export interface EstoqueResumo {
  totalItens: number
  /** `false` quando a última sincronização de estoque falhou — mesmo sentido de antes. */
  disponivel: boolean
  locais: LocalEstoqueResumo[]
}

/** `GET /formas-pagamento` — dimensão de formas de pagamento. */
export interface FormaPagamentoDim {
  codigo: string
  descricao: string
  idTipo: string
  tipoDescricao: string
  aVista: boolean
  ativo: boolean
}

/** `GET /clientes` (paginado) — clientes/fornecedores. */
export interface Pessoa {
  [key: string]: unknown
  codigo: string
  razaoSocial: string
  fantasia: string
  tipo: string
  cnpjCpf: string
  dataCadastro: string
  ativo: boolean
  contato: { fone: string | null; celular: string | null; email: string | null }
  /** Só a UF vem legível; o município não tem lookup disponível na API de origem. */
  uf: string | null
}

/** `GET /empresa` */
export interface Empresa {
  fantasia: string
  razaoSocial: string
  cnpjCpf: string
  municipio: string
  uf: string
  logo: string | null
}

/** `GET /contas-a-receber` e `GET /contas-a-pagar` — só as ainda pendentes. */
export interface ContaPendente {
  [key: string]: unknown
  idDocumento: string
  numero: string
  nome: string
  descricao: string
  dtLancamento: string
  dtVencimento: string
  dtPagamento: string | null
  valOrigem: number
  valPago: number
  valDesconto: number
  valSaldo: number
  status: string
}

/** `GET /comissoes` */
export interface Comissao {
  [key: string]: unknown
  nomeFuncionario: string
  valTotalLiquido: number
  valTotalComissao: number
}

export interface Loja {
  id: string
  nome: string
  codigo?: string
  cnpj?: string
  cidade?: string
  uf?: string
  ativo?: boolean
}

export type PeriodoPreset = 'dia' | 'ontem' | 'dia-anterior' | 'semana' | 'mes' | 'mes-anterior' | 'trimestre' | 'semestre' | 'ano' | 'personalizado'

export interface PeriodoRange {
  inicio: string
  fim: string
}

export interface FiltrosState {
  periodo: PeriodoPreset
  range: PeriodoRange
  idCaixa: string | 'todos'
  lojasSelecionadas: string[]
}
