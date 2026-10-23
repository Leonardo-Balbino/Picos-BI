import { computed } from 'vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useLojasStore } from '@/stores/useLojasStore'
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
  custoTotal: number
  cmvPercentual: number
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
  const lojasStore = useLojasStore()

  const intervalo = computed<Intervalo>(() => resolverIntervalo(filters.periodo, filters.range))

  const documentos = computed<Venda[]>(() => {
    let base = vendasStore.documentos

    // Filtro Multiloja: se houver lojas selecionadas, filtra por elas
    if (filters.lojasSelecionadas && filters.lojasSelecionadas.length > 0) {
      base = base.filter((v) => {
        // Usa exclusivamente o idLoja da venda, sem confundir idCaixa com loja
        return v.idLoja ? filters.lojasSelecionadas.includes(v.idLoja) : false
      })
    }

    // Filtro de PDV/Caixa: quando 'todos', usa todos os caixas das lojas selecionadas
    if (filters.idCaixa && filters.idCaixa !== 'todos') {
      base = base.filter((v) => v.idCaixa === filters.idCaixa)
    }

    return base
  })

  function valor(v: Venda): number {
    return v.valTotal ?? 0
  }

  function custo(v: Venda): number {
    // Estimativa benchmark do setor de açaí (35% do faturamento)
    return v.custoTotal ?? (valor(v) * 0.35)
  }

  // Vendas elegíveis (vendas válidas com valor positivo)
  const vendasElegiveis = computed(() => documentos.value.filter((v) => (v.valTotal ?? 0) > 0))
  const totalPeriodo = computed(() => vendasElegiveis.value.reduce((acc, v) => acc + valor(v), 0))
  const custoTotal = computed(() => vendasElegiveis.value.reduce((acc, v) => acc + custo(v), 0))
  const numeroVendas = computed(() => vendasElegiveis.value.length)
  // Ticket médio = Faturamento total / Quantidade total de vendas elegíveis
  const ticketMedio = computed(() => (numeroVendas.value > 0 ? totalPeriodo.value / numeroVendas.value : 0))
  const cmvPercentual = computed(() => (totalPeriodo.value > 0 ? (custoTotal.value / totalPeriodo.value) * 100 : 0))
  const isCustoEstimado = computed(() => true)

  // Só soma "hoje" dentro do que já está carregado
  const vendasHoje = computed(() => {
    const hoje = new Date()
    const hojeChave = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    return documentos.value
      .filter((v) => v.dataHora.slice(0, 10) === hojeChave)
      .reduce((acc, v) => acc + valor(v), 0)
  })

  const kpisGerais = computed(() => ({
    totalPeriodo: totalPeriodo.value,
    custoTotal: custoTotal.value,
    ticketMedio: ticketMedio.value,
    cmvPercentual: cmvPercentual.value,
    numeroVendas: numeroVendas.value,
    vendasHoje: vendasHoje.value,
    isCustoEstimado: isCustoEstimado.value,
  }))

  // Comparativo Lado a Lado genuíno entre unidades
  const comparativoLojas = computed<ComparativoLojaLinha[]>(() => {
    const lojas = lojasStore.lojas
    let idsLojas: string[] = []

    if (filters.lojasSelecionadas && filters.lojasSelecionadas.length > 0) {
      idsLojas = filters.lojasSelecionadas
    } else {
      const idsPresentes = Array.from(new Set(vendasStore.documentos.map((d) => d.idLoja).filter(Boolean))) as string[]
      idsLojas = idsPresentes.length > 0 ? idsPresentes : lojas.map((l) => l.id)
    }

    const totalConsolidado = totalPeriodo.value

    return idsLojas
      .map((idLoja) => {
        const lojaObj = lojas.find((l) => l.id === idLoja)
        const vendasLoja = vendasElegiveis.value.filter((v) => v.idLoja === idLoja)
        const faturamento = vendasLoja.reduce((acc, v) => acc + valor(v), 0)
        const nVendas = vendasLoja.length
        const ticket = nVendas > 0 ? faturamento / nVendas : 0
        const cTotal = faturamento * 0.35
        const perc = totalConsolidado > 0 ? (faturamento / totalConsolidado) * 100 : 0

        return {
          idLoja,
          nomeLoja: lojaObj?.nome ?? (idLoja === 'loja-inhuma' ? 'Açaí Senses - Inhuma' : idLoja),
          cidade: lojaObj?.cidade ?? '',
          uf: lojaObj?.uf ?? '',
          faturamento: Math.round(faturamento * 100) / 100,
          numeroVendas: nVendas,
          ticketMedio: Math.round(ticket * 100) / 100,
          custoTotal: Math.round(cTotal * 100) / 100,
          cmvPercentual: 35,
          percentualFaturamento: Math.round(perc * 10) / 10,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento)
  })

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
    const somas = new Array(7).fill(0)
    for (const v of vendasElegiveis.value) {
      // Extrai YYYY-MM-DD da data respeitando a data civil da venda (timezone-safe)
      const dataStr = v.dataHora.slice(0, 10)
      const [ano, mes, dia] = dataStr.split('-').map(Number)
      if (ano && mes && dia) {
        // Date.UTC garante cálculo determinístico do dia da semana (0=Dom..6=Sáb) sem desvio de fuso
        const diaSemanaIndex = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
        somas[diaSemanaIndex] += valor(v)
      }
    }
    const maxVal = Math.max(...somas)
    const highlightIndex = maxVal > 0 ? somas.indexOf(maxVal) : -1
    const diaMaiorFaturamento = highlightIndex >= 0 ? DIAS_SEMANA[highlightIndex] : 'N/A'

    return {
      categorias: DIAS_SEMANA,
      valores: somas.map((v) => Math.round(v * 100) / 100),
      highlightIndex,
      diaMaiorFaturamento,
      valorMaiorFaturamento: maxVal,
    }
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
    for (const v of vendasElegiveis.value) {
      // Extrai a hora civil registrada no PDV local (índice 11..13 em 'YYYY-MM-DDTHH:mm:ss')
      const horaStr = v.dataHora.length >= 13 ? v.dataHora.slice(11, 13) : ''
      const hora = parseInt(horaStr, 10)
      if (!isNaN(hora) && hora >= 0 && hora < 24) {
        valores[hora] += valor(v)
      }
    }
    const maxVal = Math.max(...valores)
    const highlightIndex = maxVal > 0 ? valores.indexOf(maxVal) : -1
    const horaPico = highlightIndex >= 0 ? `${highlightIndex}h` : 'N/A'

    return {
      categorias: Array.from({ length: 24 }, (_, h) => `${h}h`),
      valores: valores.map((v) => Math.round(v * 100) / 100),
      highlightIndex,
      horaPico,
      valorPico: maxVal,
    }
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
        idLoja: v.idLoja,
        nomeLoja: v.nomeLoja,
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
    comparativoLojas,
    serieTemporalFaturamento,
    vendasPorDiaSemana,
    vendasPorPDV,
    vendasPorHora,
    porFormaPagamento,
    tabelaVendas,
    topItensVendidos,
  }
}
