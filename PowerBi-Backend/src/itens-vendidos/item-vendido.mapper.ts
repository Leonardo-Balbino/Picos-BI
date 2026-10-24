export interface ItemVendidoRaw {
  idMercadoriaVariacao?: unknown
  descricao?: unknown
  qtd?: unknown
  valTotalLiquido?: unknown
}

export interface ItemVendidoMapeado {
  idMercadoriaVariacao: string
  descricao: string
  qtd: number
  valTotalLiquido: number
}

export function mapItemVendido(raw: ItemVendidoRaw): ItemVendidoMapeado {
  return {
    idMercadoriaVariacao: String(raw.idMercadoriaVariacao ?? ''),
    descricao: String(raw.descricao ?? ''),
    qtd: Number(raw.qtd ?? 0),
    valTotalLiquido: Number(raw.valTotalLiquido ?? 0),
  }
}
