import { mapVendedoresItens, type VendedorVendaMapeado } from './vendedores-venda'
import { fatiarDiaIso } from '../common/utils/date.util'
import { mapCustoVenda } from './custo-venda'

/**
 * Payload cru de `GET /documento/v1` — schema não documentado oficialmente pela API, mapeado
 * defensivamente (mesmo padrão de `frontend/src/services/dataService.ts`, `mapVenda`): todo
 * campo tem fallback, nada quebra a sincronização inteira por causa de um campo ausente num
 * documento específico.
 */
export interface VendaRaw {
  codigo?: unknown
  numero?: unknown
  serie?: unknown
  modelo?: unknown
  modeloDescricao?: unknown
  dataHora?: unknown
  dataHoraMovimento?: unknown
  idCaixa?: unknown
  valTotal?: unknown
  tipoMovimento?: unknown
  tipoMovimentoDescricao?: unknown
  tipoMovimentoFinanceiro?: unknown
  status?: unknown
  statusDescricao?: unknown
  nomeUsuario?: unknown
  mercadoriasLista?: unknown
  pagamentosLista?: unknown
}

export interface PagamentoMapeado {
  idPagamento: string
  descricao: string
  valor: number
}

export interface VendaMapeada {
  custoTotal: number | null
  codigo: string
  numero: string
  serie: string
  modelo: string
  modeloDescricao: string
  dataHora: string
  dataHoraMovimento: string
  data: Date
  idCaixa: string
  valTotal: number | null
  tipoMovimento: string
  tipoMovimentoDescricao: string
  tipoMovimentoFinanceiro: string
  status: string
  statusDescricao: string
  nomeUsuario: string
  vendedores?: VendedorVendaMapeado[]
  pagamentos: PagamentoMapeado[]
}

interface DocumentoPagamentoRaw {
  idPagamento?: unknown
  descricao?: unknown
  valor?: unknown
}

function mapPagamento(raw: unknown): PagamentoMapeado | null {
  if (typeof raw !== 'object' || raw === null) return null
  const item = (raw as { documentoPagamento?: DocumentoPagamentoRaw }).documentoPagamento
  if (!item) return null
  return {
    idPagamento: String(item.idPagamento ?? ''),
    descricao: String(item.descricao ?? ''),
    valor: Number(item.valor ?? 0),
  }
}

export function mapVenda(raw: VendaRaw): VendaMapeada {
  const dataHora = String(raw.dataHora ?? raw.dataHoraMovimento ?? '')
  const valTotalBruto = raw.valTotal
  return {
    custoTotal: mapCustoVenda(raw.mercadoriasLista),
    codigo: String(raw.codigo ?? ''),
    numero: String(raw.numero ?? ''),
    serie: String(raw.serie ?? ''),
    modelo: String(raw.modelo ?? ''),
    modeloDescricao: String(raw.modeloDescricao ?? raw.modelo ?? ''),
    dataHora,
    dataHoraMovimento: String(raw.dataHoraMovimento ?? raw.dataHora ?? ''),
    data: new Date(`${fatiarDiaIso(dataHora)}T00:00:00.000Z`),
    idCaixa: String(raw.idCaixa ?? ''),
    valTotal: valTotalBruto === null || valTotalBruto === undefined ? null : Number(valTotalBruto),
    tipoMovimento: String(raw.tipoMovimento ?? ''),
    tipoMovimentoDescricao: String(raw.tipoMovimentoDescricao ?? ''),
    tipoMovimentoFinanceiro: String(raw.tipoMovimentoFinanceiro ?? ''),
    status: String(raw.status ?? ''),
    statusDescricao: String(raw.statusDescricao ?? ''),
    nomeUsuario: String(raw.nomeUsuario ?? ''),
    vendedores: Array.isArray(raw.mercadoriasLista) ? mapVendedoresItens(raw.mercadoriasLista) : undefined,
    pagamentos: Array.isArray(raw.pagamentosLista)
      ? raw.pagamentosLista.map(mapPagamento).filter((p): p is PagamentoMapeado => p !== null)
      : [],
  }
}
