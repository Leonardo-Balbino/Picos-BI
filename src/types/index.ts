export type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito'
export type StatusVenda = 'concluida' | 'cancelada' | 'estornada'

export interface ItemVenda {
  produtoId: string
  categoriaId: string
  quantidade: number
  precoUnit: number
  custoUnit: number
}

export interface Venda {
  id: string
  numero: string
  dataHora: string
  vendedorId: string
  clienteId: string | null
  formaPagamento: FormaPagamento
  status: StatusVenda
  itens: ItemVenda[]
  total: number
}

export interface Produto {
  id: string
  sku: string
  nome: string
  categoriaId: string
  preco: number
  custo: number
  estoque: number
}

export interface Cliente {
  id: string
  nome: string
  ramo: string
  primeiraCompra: string
  ultimaCompra: string
}

export type Segmento = 'vip' | 'regular' | 'ocasional'

export interface Vendedor {
  id: string
  nome: string
  loja: string
  avatar?: string
  metaMensal: number
}

export interface Categoria {
  id: string
  nome: string
  icone: string
}

export type PeriodoPreset = 'hoje' | '7d' | '30d' | 'mes' | 'trimestre' | 'ano' | 'personalizado'

export interface PeriodoRange {
  inicio: string
  fim: string
}

export interface FiltrosState {
  periodo: PeriodoPreset
  range: PeriodoRange
  lojaId: string | 'todas'
  categoriaId: string | 'todas'
  formaPagamento: FormaPagamento | 'todas'
  vendedorId: string | 'todos'
}
