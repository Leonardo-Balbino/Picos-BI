export interface ComissaoRaw {
  nomeFuncionario?: unknown
  valTotalLiquido?: unknown
  valTotalComissao?: unknown
}

export interface ComissaoMapeada {
  nomeFuncionario: string
  valTotalLiquido: number
  valTotalComissao: number
}

export function mapComissao(raw: ComissaoRaw): ComissaoMapeada {
  return {
    nomeFuncionario: String(raw.nomeFuncionario ?? ''),
    valTotalLiquido: Number(raw.valTotalLiquido ?? 0),
    valTotalComissao: Number(raw.valTotalComissao ?? 0),
  }
}
