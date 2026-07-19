// Tipos de domínio alinhados aos contratos reais da API Pública Meu ERP Online
// (seção 2.5 do prompt de edição v2). Nomes de campo pt-BR seguem o que a API
// devolve; conversão de camelCase/PascalCase de query params fica em dataService.ts.

/** Forma de pagamento embutida num documento de venda (`pagamentosLista[].documentoPagamento`). */
export interface PagamentoDocumento {
  idPagamento: string
  descricao: string
  valor: number
}

/** `GET /api/documento/v1` — fato de vendas (um cupom/nota por linha). */
export interface Venda {
  codigo: string
  numero: string
  serie: string
  modelo: string
  modeloDescricao: string
  dataHora: string
  dataHoraMovimento: string
  idCaixa: string
  valTotal: number | null
  tipoMovimento: string
  tipoMovimentoDescricao: string
  tipoMovimentoFinanceiro: string
  status: string
  statusDescricao: string
  nomeUsuario: string
  pagamentos: PagamentoDocumento[]
}

/** `GET /api/documento/mercadorias-vendidas/v1` — item vendido, já agregado pela API por período. */
export interface ItemVendido {
  idMercadoriaVariacao: string
  descricao: string
  qtd: number
  valTotalLiquido: number
}

/** `GET /api/mercadoria/v1` — catálogo (sem preço nem saldo por item). */
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

/** `GET /api/local-estoque/v1` */
export interface LocalEstoque {
  codigo: string
  descricao: string
  ativo: boolean
}

/** `GET /api/local-estoque/{id}/estoques/v1` — 🔒 não testada, schema validado em runtime. */
export interface SaldoEstoque {
  idMercadoriaVariacao: string
  qtdSaldo: number
  qtdSaldoReserva: number
  dataHora: string
}

/** `GET /api/pagamento/v1` — dimensão de formas de pagamento. */
export interface FormaPagamentoDim {
  codigo: string
  descricao: string
  idTipo: string
  tipoDescricao: string
  aVista: boolean
  ativo: boolean
}

/** `GET /api/pessoa/v1` — clientes/fornecedores. */
export interface Pessoa {
  [key: string]: unknown
  codigo: string
  razaoSocial: string
  fantasia: string
  tipo: string
  cnpjCpf: string
  dataCadastro: string
  ativo: boolean
  contato: { fone?: string; celular?: string; email?: string }
  /** Só a UF vem legível (`enderecoPrincipal.uf`); o município só existe como `idIbgeMunicipio` numérico, sem lookup disponível na API. */
  uf?: string
}

/** `GET /api/empresa/v1` */
export interface Empresa {
  fantasia: string
  razaoSocial: string
  cnpjCpf: string
  municipio: string
  uf: string
  logo?: string
}

/** `GET /api/conta-pagar/pendentes/v1` e `GET /api/conta-receber/pendentes/v1`. */
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

/** `GET /api/funcionario/comissoes/v1` */
export interface Comissao {
  [key: string]: unknown
  nomeFuncionario: string
  valTotalLiquido: number
  valTotalComissao: number
}

/** `GET /api/dre/v1` — retorno não paginado. */
export interface DreLinha {
  descricao: string
  principal: boolean
  classificacao: string
  periodos: { indice: number; valor: number; porcentagem: number }[]
}
export interface Dre {
  periodos: unknown[]
  linhas: DreLinha[]
}

export type PeriodoPreset = 'dia' | 'semana' | 'mes' | 'semestre' | 'ano' | 'personalizado'

export interface PeriodoRange {
  inicio: string
  fim: string
}

export interface FiltrosState {
  periodo: PeriodoPreset
  range: PeriodoRange
  idCaixa: string | 'todos'
}
