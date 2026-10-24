import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import type { VendaResponseDto } from './dto/venda-response.dto'

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
    isCustoEstimado: false
  }
  serieTemporal: Record<string, number>
  porDiaSemana: number[]
  porHora: number[]
  porPDV: Array<{ idCaixa: string; total: number }>
  pagamentos: Array<{ idPagamento: string; valor: number; nTransacoes: number }>
  comparativo: Array<{ idLoja: string; faturamento: number; numeroVendas: number }>
}

export function resumirVendas(
  vendasAutorizadas: VendaResponseDto[],
  idsLojas: string[],
  idCaixa?: string,
): ResumoVendas {
  const vendasDasLojas = vendasAutorizadas.filter((v) => idsLojas.length === 0 || Boolean(v.idLoja && idsLojas.includes(v.idLoja)))
  const idsCaixa = [...new Set(vendasDasLojas.map((v) => v.idCaixa))].sort()
  const vendas = vendasAutorizadas.filter(
    (v) => (idsLojas.length === 0 || Boolean(v.idLoja && idsLojas.includes(v.idLoja))) &&
      (!idCaixa || idCaixa === 'todos' || v.idCaixa === idCaixa),
  )
  const serieTemporal: Record<string, number> = {}
  const porDiaSemana = Array<number>(7).fill(0)
  const porHora = Array<number>(24).fill(0)
  const porPDV = new Map<string, number>()
  const pagamentos = new Map<string, { valor: number; nTransacoes: number; descricao: string }>()
  const comparativo = new Map<string, { faturamento: number; numeroVendas: number }>()
  let totalPeriodo = 0
  let numeroVendas = 0
  let somaCustos = 0
  let vendasSemCusto = 0
  let vendasHoje = 0
  const hoje = new Date()
  const hojeChave = [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-')

  for (const v of vendas) {
    const valor = v.valTotal ?? 0
    const dia = v.dataHora.slice(0, 10)
    serieTemporal[dia] = (serieTemporal[dia] ?? 0) + valor
    porPDV.set(v.idCaixa, (porPDV.get(v.idCaixa) ?? 0) + valor)
    if (dia === hojeChave) vendasHoje += valor

    for (const p of v.pagamentos) {
      // A dimensão usa namespace da empresa; o documento guarda o ID original do ERP.
      const codigo = codigoDaLoja(p.idPagamento, v.idLoja ?? undefined)
      const atual = pagamentos.get(codigo) ?? { valor: 0, nTransacoes: 0, descricao: p.descricao || '' }
      if (!atual.descricao && p.descricao) atual.descricao = p.descricao
      atual.valor += p.valor
      atual.nTransacoes++
      pagamentos.set(codigo, atual)
    }

    if (valor <= 0) continue
    totalPeriodo += valor
    numeroVendas++
    if (v.custoTotal == null || !Number.isFinite(v.custoTotal) || v.custoTotal < 0) vendasSemCusto++
    else somaCustos += v.custoTotal
    if (v.idLoja) {
      const atual = comparativo.get(v.idLoja) ?? { faturamento: 0, numeroVendas: 0 }
      atual.faturamento += valor
      atual.numeroVendas++
      comparativo.set(v.idLoja, atual)
    }
    const partes = dia.split('-').map(Number)
    if (partes.length === 3 && partes.every(Boolean)) {
      porDiaSemana[new Date(Date.UTC(partes[0], partes[1] - 1, partes[2])).getUTCDay()] += valor
    }
    const hora = Number.parseInt(v.dataHora.slice(11, 13), 10)
    if (Number.isInteger(hora) && hora >= 0 && hora < 24) porHora[hora] += valor
  }

  const moeda = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  const custoTotal = vendasSemCusto ? null : moeda(somaCustos)
  const lucroBruto = custoTotal === null ? null : moeda(totalPeriodo - custoTotal)
  return {
    idsCaixa,
    idsLojasPresentes: [...new Set(vendas.map((v) => v.idLoja).filter((id): id is string => Boolean(id)))],
    kpisGerais: {
      totalPeriodo,
      custoTotal,
      lucroBruto,
      margemLucro: lucroBruto === null ? null : totalPeriodo ? (lucroBruto / totalPeriodo) * 100 : 0,
      vendasSemCusto,
      ticketMedio: numeroVendas ? totalPeriodo / numeroVendas : 0,
      cmvPercentual: custoTotal === null ? null : totalPeriodo ? (custoTotal / totalPeriodo) * 100 : 0,
      numeroVendas,
      vendasHoje,
      isCustoEstimado: false,
    },
    serieTemporal,
    porDiaSemana,
    porHora,
    porPDV: [...porPDV].map(([idCaixa, total]) => ({ idCaixa, total })).sort((a, b) => b.total - a.total),
    pagamentos: [...pagamentos].map(([idPagamento, dados]) => ({ idPagamento, ...dados })).sort((a, b) => b.valor - a.valor),
    comparativo: [...comparativo].map(([idLoja, dados]) => ({ idLoja, ...dados })),
  }
}
