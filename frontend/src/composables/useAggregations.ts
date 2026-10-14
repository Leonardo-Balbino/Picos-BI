import { computed } from 'vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { resolverIntervalo, type Intervalo } from '@/utils/periodo'
import { formatShortDate } from '@/utils/formatters'
import type { Venda } from '@/types'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export interface VendaExibicao extends Record<string, unknown> {
  codigo: string
  dataHora: string
  numero: string
  serie: string
  modeloDescricao: string
  idCaixa: string
  nomeUsuario: string
  valTotal: number
  statusDescricao: string
}

export interface FormaPagamentoLinha extends Record<string, unknown> {
  idPagamento: string
  label: string
  valor: number
  nTransacoes: number
  ticketMedio: number
  percentual: number
}

/**
 * Agregações client-side sobre `useVendasStore` (já filtrado pelo período/`DataInicio`-`DataFim`
 * atual — não há necessidade de refiltrar por data aqui, só pelo PDV opcional). Nenhuma função
 * aqui dispara requisição própria: tudo lê do que a store já carregou para o período
 * selecionado, para nunca buscar dados fora do intervalo escolhido nos filtros globais.
 * "Vendas de Hoje" e a variação vs. período anterior foram removidas por causa disso — exigiam
 * uma consulta extra fora do período (ver histórico do commit se precisar reintroduzir).
 */
export function useAggregations() {
  const vendasStore = useVendasStore()
  const filters = useFiltersStore()
  const dimensoes = useDimensoesStore()

  const intervalo = computed<Intervalo>(() => resolverIntervalo(filters.periodo, filters.range))

  const documentos = computed<Venda[]>(() => {
    const base = vendasStore.documentosValidos
    if (filters.idCaixa === 'todos') return base
    return base.filter((v) => v.idCaixa === filters.idCaixa)
  })

  function valor(v: Venda): number {
    return v.valTotal ?? 0
  }

  const totalPeriodo = computed(() => documentos.value.reduce((acc, v) => acc + valor(v), 0))
  const numeroVendas = computed(() => documentos.value.length)
  const ticketMedio = computed(() => (numeroVendas.value ? totalPeriodo.value / numeroVendas.value : 0))

  // Só soma "hoje" dentro do que já está carregado — se o período selecionado não inclui
  // hoje (ex.: um range personalizado no passado), fica 0 em vez de buscar fora do filtro.
  const vendasHoje = computed(() => {
    const hoje = new Date()
    const hojeChave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    return documentos.value
      .filter((v) => v.dataHora.slice(0, 10) === hojeChave)
      .reduce((acc, v) => acc + valor(v), 0)
  })

  const kpisGerais = computed(() => ({
    totalPeriodo: totalPeriodo.value,
    vendasHoje: vendasHoje.value,
    numeroVendas: numeroVendas.value,
    ticketMedio: ticketMedio.value,
  }))

  function serieTemporalFaturamento() {
    const mapa = new Map<string, number>()
    for (const v of documentos.value) {
      mapa.set(v.dataHora.slice(0, 10), (mapa.get(v.dataHora.slice(0, 10)) ?? 0) + valor(v))
    }
    const totalDias = Math.max(
      1,
      Math.round((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1,
    )
    const categorias: string[] = []
    const valores: number[] = []
    for (let i = 0; i < totalDias; i++) {
      const dia = new Date(intervalo.value.inicio.getTime() + i * 86400000)
      const chave = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
      categorias.push(formatShortDate(dia))
      valores.push(Math.round((mapa.get(chave) ?? 0) * 100) / 100)
    }
    return { categorias, valores }
  }

  function vendasPorDiaSemana() {
    const contagem = new Array(7).fill(0)
    for (const v of documentos.value) contagem[new Date(v.dataHora).getDay()]++
    return { categorias: DIAS_SEMANA, valores: contagem, highlightIndex: new Date().getDay() }
  }

  function vendasPorPDV() {
    const mapa = new Map<string, number>()
    for (const v of documentos.value) mapa.set(v.idCaixa, (mapa.get(v.idCaixa) ?? 0) + valor(v))
    const linhas = Array.from(mapa.entries())
      .map(([idCaixa, total]) => ({ idCaixa, label: `Caixa ${idCaixa}`, total }))
      .sort((a, b) => b.total - a.total)
    return { categorias: linhas.map((l) => l.label), valores: linhas.map((l) => l.total) }
  }

  function vendasPorHora() {
    const valores = new Array(24).fill(0)
    for (const v of documentos.value) valores[new Date(v.dataHora).getHours()] += valor(v)
    const highlightIndex = valores.indexOf(Math.max(...valores))
    return { categorias: Array.from({ length: 24 }, (_, h) => `${h}h`), valores, highlightIndex }
  }

  function porFormaPagamento(): FormaPagamentoLinha[] {
    const somas = new Map<string, number>()
    const transacoes = new Map<string, number>()
    for (const v of documentos.value) {
      for (const p of v.pagamentos) {
        somas.set(p.idPagamento, (somas.get(p.idPagamento) ?? 0) + p.valor)
        transacoes.set(p.idPagamento, (transacoes.get(p.idPagamento) ?? 0) + 1)
      }
    }
    const total = Array.from(somas.values()).reduce((a, b) => a + b, 0)
    return Array.from(somas.entries())
      .map(([idPagamento, valorForma]) => {
        const nTransacoes = transacoes.get(idPagamento) ?? 0
        return {
          idPagamento,
          label: dimensoes.labelFormaPagamento(idPagamento),
          valor: valorForma,
          nTransacoes,
          ticketMedio: nTransacoes ? valorForma / nTransacoes : 0,
          percentual: total ? (valorForma / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.valor - a.valor)
  }

  const tabelaVendas = computed<VendaExibicao[]>(() =>
    [...documentos.value]
      .map((v) => ({
        codigo: v.codigo,
        dataHora: v.dataHora,
        numero: v.numero,
        serie: v.serie,
        modeloDescricao: v.modeloDescricao,
        idCaixa: v.idCaixa,
        nomeUsuario: v.nomeUsuario,
        valTotal: valor(v),
        statusDescricao: v.statusDescricao,
      }))
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
  )

  function topItensVendidos(n: number) {
    return [...vendasStore.itensVendidos].sort((a, b) => b.valTotalLiquido - a.valTotalLiquido).slice(0, n)
  }

  return {
    intervalo,
    kpisGerais,
    serieTemporalFaturamento,
    vendasPorDiaSemana,
    vendasPorPDV,
    vendasPorHora,
    porFormaPagamento,
    tabelaVendas,
    topItensVendidos,
  }
}
