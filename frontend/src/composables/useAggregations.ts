import { computed } from 'vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useLojasStore } from '@/stores/useLojasStore'
import { resolverIntervalo, type Intervalo } from '@/utils/periodo'
import { formatShortDate } from '@/utils/formatters'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export interface VendaExibicao extends Record<string, unknown> {
  codigo: string
  dataHora: string
  numero: string
  serie: string
  modeloDescricao: string
  idCaixa: string
  idLoja?: string
  nomeLoja?: string
  nomeUsuario: string
  valTotal: number
  statusDescricao: string
}

export interface ComparativoLojaLinha extends Record<string, unknown> {
  idLoja: string
  nomeLoja: string
  cidade: string
  uf: string
  faturamento: number
  numeroVendas: number
  ticketMedio: number
  custoTotal: number | null
  cmvPercentual: number | null
  percentualFaturamento: number
}

export interface FormaPagamentoLinha extends Record<string, unknown> {
  idPagamento: string
  label: string
  valor: number
  nTransacoes: number
  ticketMedio: number
  percentual: number
}

/** Lê séries e indicadores já calculados no backend; não transfere o histórico bruto ao painel. */
export function useAggregations() {
  const vendasStore = useVendasStore()
  const filters = useFiltersStore()
  const dimensoes = useDimensoesStore()
  const lojasStore = useLojasStore()
  const intervalo = computed<Intervalo>(() => resolverIntervalo(filters.periodo, filters.range))
  const resumo = computed(() => vendasStore.resumo)
  const kpisGerais = computed(() => resumo.value?.kpisGerais ?? {
    totalPeriodo: 0,
    custoTotal: null,
    lucroBruto: null,
    margemLucro: null,
    vendasSemCusto: 0,
    ticketMedio: 0,
    cmvPercentual: 0,
    numeroVendas: 0,
    vendasHoje: 0,
    isCustoEstimado: false,
  })

  const comparativoLojas = computed<ComparativoLojaLinha[]>(() => {
    const ids = filters.lojasSelecionadas.length > 0
      ? filters.lojasSelecionadas
      : resumo.value?.idsLojasPresentes.length
        ? resumo.value.idsLojasPresentes
        : lojasStore.lojas.map((l) => l.id)
    const total = kpisGerais.value.totalPeriodo
    return ids.map((idLoja: string) => {
      const loja = lojasStore.lojas.find((l) => l.id === idLoja)
      const dados = resumo.value?.comparativo.find((c: { idLoja: string; faturamento: number; numeroVendas: number }) => c.idLoja === idLoja)
      const faturamento = dados?.faturamento ?? 0
      const numeroVendas = dados?.numeroVendas ?? 0
      return {
        idLoja,
        nomeLoja: loja?.nome ?? (idLoja === 'loja-inhuma' ? 'Açaí Senses - Inhuma' : idLoja),
        cidade: loja?.cidade ?? '',
        uf: loja?.uf ?? '',
        faturamento: Math.round(faturamento * 100) / 100,
        numeroVendas,
        ticketMedio: numeroVendas ? Math.round((faturamento / numeroVendas) * 100) / 100 : 0,
        custoTotal: null,
        cmvPercentual: null,
        percentualFaturamento: total ? Math.round((faturamento / total) * 1000) / 10 : 0,
      }
    }).sort((a: ComparativoLojaLinha, b: ComparativoLojaLinha) => b.faturamento - a.faturamento)
  })

  function serieTemporalFaturamento(agruparSemanas = true) {
    const mapa = resumo.value?.serieTemporal ?? {}
    const totalDias = Math.max(1, Math.floor((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1)
    const dias: Date[] = []
    const valoresDiarios: number[] = []
    for (let i = 0; i < totalDias; i++) {
      const dia = new Date(intervalo.value.inicio.getTime() + i * 86400000)
      const chave = [dia.getFullYear(), String(dia.getMonth() + 1).padStart(2, '0'), String(dia.getDate()).padStart(2, '0')].join('-')
      dias.push(dia)
      valoresDiarios.push(mapa[chave] ?? 0)
    }

    // O gráfico anual tinha 365 pontos e rótulos no DOM. A API conserva os totais diários;
    // apenas a apresentação agrupa períodos longos em blocos de sete dias.
    if (agruparSemanas && totalDias > 90) {
      const categorias: string[] = []
      const valores: number[] = []
      for (let inicio = 0; inicio < totalDias; inicio += 7) {
        const fim = Math.min(inicio + 6, totalDias - 1)
        categorias.push(formatShortDate(dias[inicio]) + '–' + formatShortDate(dias[fim]))
        const total = valoresDiarios.slice(inicio, fim + 1).reduce((soma, valor) => soma + valor, 0)
        valores.push(Math.round(total * 100) / 100)
      }
      return { categorias, valores, granularidade: 'semana' as const }
    }

    return {
      categorias: dias.map(formatShortDate),
      valores: valoresDiarios.map((valor) => Math.round(valor * 100) / 100),
      granularidade: 'dia' as const,
    }
  }

  function vendasPorDiaSemana() {
    const somas = resumo.value?.porDiaSemana ?? Array<number>(7).fill(0)
    const maxVal = Math.max(...somas)
    const highlightIndex = maxVal > 0 ? somas.indexOf(maxVal) : -1
    return {
      categorias: DIAS_SEMANA,
      valores: somas.map((v: number) => Math.round(v * 100) / 100),
      highlightIndex,
      diaMaiorFaturamento: highlightIndex >= 0 ? DIAS_SEMANA[highlightIndex] : 'N/A',
      valorMaiorFaturamento: maxVal,
    }
  }

  function vendasPorPDV() {
    const linhas = resumo.value?.porPDV ?? []
    return { categorias: linhas.map((l: { idCaixa: string; total: number }) => 'Caixa ' + l.idCaixa), valores: linhas.map((l: { idCaixa: string; total: number }) => l.total) }
  }

  function vendasPorHora() {
    const valores = resumo.value?.porHora ?? Array<number>(24).fill(0)
    const ativos = valores.map((v: number, i: number) => v > 0 ? i : -1).filter((i: number) => i >= 0)
    const inicio = ativos[0] ?? 0
    const fim = ativos[ativos.length - 1] ?? 23
    const exibidos = valores.slice(inicio, fim + 1)
    const maxVal = Math.max(...exibidos)
    const destaque = maxVal > 0 ? exibidos.indexOf(maxVal) : -1
    return {
      categorias: exibidos.map((_: number, i: number) => String(inicio + i) + 'h'),
      valores: exibidos.map((v: number) => Math.round(v * 100) / 100),
      highlightIndex: destaque,
      horaPico: destaque >= 0 ? String(inicio + destaque) + 'h' : 'N/A',
      valorPico: maxVal,
    }
  }

  function porFormaPagamento(): FormaPagamentoLinha[] {
    const linhas = resumo.value?.pagamentos ?? []
    const grupos = new Map<string, { label: string; valor: number; nTransacoes: number }>()

    for (const p of linhas) {
      const label = dimensoes.labelFormaPagamento(p.idPagamento, (p as any).descricao)
      const atual = grupos.get(label) ?? { label, valor: 0, nTransacoes: 0 }
      atual.valor += p.valor
      atual.nTransacoes += p.nTransacoes
      grupos.set(label, atual)
    }

    const total = Array.from(grupos.values()).reduce((acc, g) => acc + g.valor, 0)
    return Array.from(grupos.entries())
      .map(([id, g]) => ({
        idPagamento: id,
        label: g.label,
        valor: Math.round(g.valor * 100) / 100,
        nTransacoes: g.nTransacoes,
        ticketMedio: g.nTransacoes ? Math.round((g.valor / g.nTransacoes) * 100) / 100 : 0,
        percentual: total ? (g.valor / total) * 100 : 0,
      }))
      .sort((a, b) => b.valor - a.valor)
  }

  function topItensVendidos(n: number) {
    return [...vendasStore.itensVendidos].sort((a, b) => b.valTotalLiquido - a.valTotalLiquido).slice(0, n)
  }

  return {
    intervalo, kpisGerais, comparativoLojas, serieTemporalFaturamento,
    vendasPorDiaSemana, vendasPorPDV, vendasPorHora, porFormaPagamento, topItensVendidos,
  }
}
