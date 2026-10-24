import { stringApiParaDia } from '../common/utils/date.util'

export interface ContaPendenteRaw {
  idDocumento?: unknown
  idPessoa?: unknown
  idSequencia?: unknown
  idParcela?: unknown
  numero?: unknown
  nome?: unknown
  descricao?: unknown
  dtLancamento?: unknown
  dtVencimento?: unknown
  dtPagamento?: unknown
  valOrigem?: unknown
  valPago?: unknown
  valDesconto?: unknown
  valSaldo?: unknown
  status?: unknown
}

export interface ContaPendenteMapeada {
  idDocumento: string
  idDocumentoErp?: string
  idPessoa?: string | null
  idSequencia?: string | null
  idParcela?: string | null
  numero: string
  nome: string
  descricao: string
  dtLancamento: Date
  dtVencimento: Date
  dtPagamento: Date | null
  valOrigem: number
  valPago: number
  valDesconto: number
  valSaldo: number
  status: string
}

export function mapContaPendente(raw: ContaPendenteRaw): ContaPendenteMapeada {
  return {
    idDocumento: String(raw.idDocumento ?? ''),
    idDocumentoErp: String(raw.idDocumento ?? ''),
    idPessoa: raw.idPessoa == null ? null : String(raw.idPessoa),
    idSequencia: raw.idSequencia == null ? null : String(raw.idSequencia),
    idParcela: raw.idParcela == null ? null : String(raw.idParcela),
    numero: String(raw.numero ?? ''),
    nome: String(raw.nome ?? ''),
    descricao: String(raw.descricao ?? ''),
    dtLancamento: stringApiParaDia(String(raw.dtLancamento ?? '1970-01-01')),
    dtVencimento: stringApiParaDia(String(raw.dtVencimento ?? '1970-01-01')),
    dtPagamento: raw.dtPagamento ? stringApiParaDia(String(raw.dtPagamento)) : null,
    valOrigem: Number(raw.valOrigem ?? 0),
    valPago: Number(raw.valPago ?? 0),
    valDesconto: Number(raw.valDesconto ?? 0),
    valSaldo: Number(raw.valSaldo ?? 0),
    status: String(raw.status ?? ''),
  }
}
