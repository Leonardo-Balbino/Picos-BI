import { flagAtivo } from '../upstream/erp.constants'

export interface FormaPagamentoRaw {
  codigo?: unknown
  descricao?: unknown
  idTipo?: unknown
  tipoDescricao?: unknown
  aVista?: unknown
  ativo?: unknown
}

export interface FormaPagamentoMapeada {
  codigo: string
  descricao: string
  idTipo: string
  tipoDescricao: string
  aVista: boolean
  ativo: boolean
}

export function mapFormaPagamento(raw: FormaPagamentoRaw): FormaPagamentoMapeada {
  return {
    codigo: String(raw.codigo ?? ''),
    descricao: String(raw.descricao ?? ''),
    idTipo: String(raw.idTipo ?? ''),
    tipoDescricao: String(raw.tipoDescricao ?? ''),
    aVista: flagAtivo(raw.aVista),
    ativo: flagAtivo(raw.ativo),
  }
}
