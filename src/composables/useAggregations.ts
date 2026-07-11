import { computed } from 'vue'
import { useVendasStore } from '@/stores/useVendasStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useConfiguracoesStore } from '@/stores/useConfiguracoesStore'
import { formatShortDate } from '@/utils/formatters'
import type { Venda, ItemVenda, PeriodoPreset, PeriodoRange, Segmento } from '@/types'

/** Âncora de "hoje" alinhada ao fim do dataset seed (jan–jul/2026). */
const HOJE = new Date(Date.UTC(2026, 6, 11, 23, 59, 59))

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

interface Intervalo {
  inicio: Date
  fim: Date
}

function inicioDoDia(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(0, 0, 0, 0)
  return x
}
function fimDoDia(d: Date): Date {
  const x = new Date(d)
  x.setUTCHours(23, 59, 59, 999)
  return x
}
function addDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000)
}

function resolverIntervalo(periodo: PeriodoPreset, range: PeriodoRange): Intervalo {
  const fim = fimDoDia(HOJE)
  switch (periodo) {
    case 'hoje':
      return { inicio: inicioDoDia(HOJE), fim }
    case '7d':
      return { inicio: inicioDoDia(addDias(HOJE, -6)), fim }
    case 'mes':
      return { inicio: new Date(Date.UTC(HOJE.getUTCFullYear(), HOJE.getUTCMonth(), 1)), fim }
    case 'trimestre':
      return { inicio: new Date(Date.UTC(HOJE.getUTCFullYear(), HOJE.getUTCMonth() - 2, 1)), fim }
    case 'ano':
      return { inicio: new Date(Date.UTC(HOJE.getUTCFullYear(), 0, 1)), fim }
    case 'personalizado':
      return {
        inicio: range.inicio ? inicioDoDia(new Date(range.inicio)) : inicioDoDia(addDias(HOJE, -29)),
        fim: range.fim ? fimDoDia(new Date(range.fim)) : fim,
      }
    case '30d':
    default:
      return { inicio: inicioDoDia(addDias(HOJE, -29)), fim }
  }
}

function resolverIntervaloAnterior(atual: Intervalo): Intervalo {
  const duracaoMs = atual.fim.getTime() - atual.inicio.getTime()
  const fimAnterior = new Date(atual.inicio.getTime() - 1)
  const inicioAnterior = new Date(fimAnterior.getTime() - duracaoMs)
  return { inicio: inicioAnterior, fim: fimAnterior }
}

function dataDentroDoIntervalo(dataISO: string, iv: Intervalo): boolean {
  const t = new Date(dataISO).getTime()
  return t >= iv.inicio.getTime() && t <= iv.fim.getTime()
}
function dentroDoIntervalo(v: Venda, iv: Intervalo): boolean {
  return dataDentroDoIntervalo(v.dataHora, iv)
}

function valorItens(itens: ItemVenda[]): number {
  return itens.reduce((acc, it) => acc + it.quantidade * it.precoUnit, 0)
}
function quantidadeItens(itens: ItemVenda[]): number {
  return itens.reduce((acc, it) => acc + it.quantidade, 0)
}

export function variacaoPercentual(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}

export interface FormaPagamentoLinha {
  [key: string]: unknown
  forma: string
  label: string
  valor: number
  nTransacoes: number
  ticketMedio: number
  percentual: number
}

export interface VendedorTabela {
  [key: string]: unknown
  vendedorId: string
  nome: string
  loja: string
  faturamento: number
  nVendas: number
  ticketMedio: number
  statusMeta: number
  tendencia: number
}

export interface ProdutoTabela {
  [key: string]: unknown
  produtoId: string
  sku: string
  nome: string
  categoriaNome: string
  quantidade: number
  faturamento: number
  ticketMedio: number
  margem: number
  estoque: number
}

export interface VendaExibicao {
  [key: string]: unknown
  id: string
  numero: string
  dataHora: string
  vendedorNome: string
  clienteNome: string
  nItens: number
  formaPagamento: Venda['formaPagamento']
  total: number
  status: Venda['status']
}

export function useAggregations() {
  const store = useVendasStore()
  const filters = useFiltersStore()
  const config = useConfiguracoesStore()

  const intervalo = computed(() => resolverIntervalo(filters.periodo, filters.range))
  const intervaloAnterior = computed(() => resolverIntervaloAnterior(intervalo.value))

  function passaFiltrosBase(v: Venda): boolean {
    if (filters.vendedorId !== 'todos' && v.vendedorId !== filters.vendedorId) return false
    if (filters.formaPagamento !== 'todas' && v.formaPagamento !== filters.formaPagamento) return false
    if (filters.lojaId !== 'todas') {
      const vendedor = store.vendedorPorId(v.vendedorId)
      if (!vendedor || vendedor.loja !== filters.lojaId) return false
    }
    return true
  }

  function itensFiltrados(v: Venda): ItemVenda[] {
    if (filters.categoriaId === 'todas') return v.itens
    return v.itens.filter((it) => it.categoriaId === filters.categoriaId)
  }

  function vendasNoIntervalo(iv: Intervalo): Venda[] {
    return store.vendas.filter((v) => passaFiltrosBase(v) && dentroDoIntervalo(v, iv) && itensFiltrados(v).length > 0)
  }

  const vendasFiltradas = computed(() => vendasNoIntervalo(intervalo.value))
  const vendasFiltradasAnterior = computed(() => vendasNoIntervalo(intervaloAnterior.value))

  const vendasConcluidas = computed(() => vendasFiltradas.value.filter((v) => v.status === 'concluida'))
  const vendasConcluidasAnterior = computed(() => vendasFiltradasAnterior.value.filter((v) => v.status === 'concluida'))

  const faturamento = computed(() => vendasConcluidas.value.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0))
  const faturamentoAnterior = computed(() =>
    vendasConcluidasAnterior.value.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0),
  )

  const numeroVendas = computed(() => vendasConcluidas.value.length)
  const numeroVendasAnterior = computed(() => vendasConcluidasAnterior.value.length)

  const ticketMedio = computed(() => (numeroVendas.value ? faturamento.value / numeroVendas.value : 0))
  const ticketMedioAnterior = computed(() =>
    numeroVendasAnterior.value ? faturamentoAnterior.value / numeroVendasAnterior.value : 0,
  )

  const itensVendidos = computed(() =>
    vendasConcluidas.value.reduce((acc, v) => acc + quantidadeItens(itensFiltrados(v)), 0),
  )
  const itensVendidosAnterior = computed(() =>
    vendasConcluidasAnterior.value.reduce((acc, v) => acc + quantidadeItens(itensFiltrados(v)), 0),
  )

  const kpisGerais = computed(() => ({
    faturamento: faturamento.value,
    faturamentoVar: variacaoPercentual(faturamento.value, faturamentoAnterior.value),
    numeroVendas: numeroVendas.value,
    numeroVendasVar: variacaoPercentual(numeroVendas.value, numeroVendasAnterior.value),
    ticketMedio: ticketMedio.value,
    ticketMedioVar: variacaoPercentual(ticketMedio.value, ticketMedioAnterior.value),
    itensVendidos: itensVendidos.value,
    itensVendidosVar: variacaoPercentual(itensVendidos.value, itensVendidosAnterior.value),
  }))

  const metaDoMes = computed(() => {
    const inicioMes = new Date(Date.UTC(HOJE.getUTCFullYear(), HOJE.getUTCMonth(), 1))
    const iv: Intervalo = { inicio: inicioMes, fim: fimDoDia(HOJE) }
    const vendasMes = vendasNoIntervalo(iv).filter((v) => v.status === 'concluida')
    const faturamentoMes = vendasMes.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0)
    const meta = config.dados?.metas.faturamentoMensalGlobal ?? 0
    const progresso = meta > 0 ? Math.min(100, Math.round((faturamentoMes / meta) * 100)) : 0
    return { faturamentoMes, meta, progresso }
  })

  function serieTemporalFaturamento() {
    const dias: string[] = []
    const valores: number[] = []
    const mapa = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      const chave = v.dataHora.slice(0, 10)
      mapa.set(chave, (mapa.get(chave) ?? 0) + valorItens(itensFiltrados(v)))
    }
    const totalDias = Math.round((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1
    for (let i = 0; i < totalDias; i++) {
      const dia = addDias(intervalo.value.inicio, i)
      const chave = dia.toISOString().slice(0, 10)
      dias.push(formatShortDate(dia))
      valores.push(Math.round((mapa.get(chave) ?? 0) * 100) / 100)
    }
    return { categorias: dias, valores }
  }

  function serieTemporalNumeroVendas() {
    const dias: string[] = []
    const valores: number[] = []
    const mapa = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      const chave = v.dataHora.slice(0, 10)
      mapa.set(chave, (mapa.get(chave) ?? 0) + 1)
    }
    const totalDias = Math.round((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1
    for (let i = 0; i < totalDias; i++) {
      const dia = addDias(intervalo.value.inicio, i)
      const chave = dia.toISOString().slice(0, 10)
      dias.push(formatShortDate(dia))
      valores.push(mapa.get(chave) ?? 0)
    }
    return { categorias: dias, valores }
  }

  function vendasPorDiaSemana() {
    const contagem = new Array(7).fill(0)
    for (const v of vendasConcluidas.value) {
      contagem[new Date(v.dataHora).getUTCDay()]++
    }
    return { categorias: DIAS_SEMANA, valores: contagem, highlightIndex: HOJE.getUTCDay() }
  }

  function faturamentoPorDiaSemana() {
    const soma = new Array(7).fill(0)
    for (const v of vendasConcluidas.value) {
      soma[new Date(v.dataHora).getUTCDay()] += valorItens(itensFiltrados(v))
    }
    return soma
  }

  function vendasPorHora() {
    const contagem = new Array(24).fill(0)
    for (const v of vendasConcluidas.value) {
      contagem[new Date(v.dataHora).getUTCHours()]++
    }
    return contagem
  }

  const FORMAS = [
    { forma: 'credito' as const, label: 'Cartão de Crédito' },
    { forma: 'pix' as const, label: 'PIX' },
    { forma: 'debito' as const, label: 'Cartão de Débito' },
    { forma: 'dinheiro' as const, label: 'Dinheiro' },
  ]

  function porFormaPagamento(): FormaPagamentoLinha[] {
    const somas = new Map<string, number>()
    const transacoes = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      const valor = valorItens(itensFiltrados(v))
      somas.set(v.formaPagamento, (somas.get(v.formaPagamento) ?? 0) + valor)
      transacoes.set(v.formaPagamento, (transacoes.get(v.formaPagamento) ?? 0) + 1)
    }
    const total = Array.from(somas.values()).reduce((a, b) => a + b, 0)
    return FORMAS.map(({ forma, label }) => {
      const valor = somas.get(forma) ?? 0
      const nTransacoes = transacoes.get(forma) ?? 0
      return {
        forma,
        label,
        valor,
        nTransacoes,
        ticketMedio: nTransacoes ? valor / nTransacoes : 0,
        percentual: total ? (valor / total) * 100 : 0,
      }
    })
  }

  function evolucaoDiariaPorFormaPagamento() {
    const dias: string[] = []
    const seriesPorForma = new Map<string, number[]>(FORMAS.map(({ forma }) => [forma, []]))
    const totalDias = Math.round((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1
    const mapaPorDia = new Map<string, Map<string, number>>()
    for (const v of vendasConcluidas.value) {
      const chave = v.dataHora.slice(0, 10)
      if (!mapaPorDia.has(chave)) mapaPorDia.set(chave, new Map())
      const mapaForma = mapaPorDia.get(chave)!
      mapaForma.set(v.formaPagamento, (mapaForma.get(v.formaPagamento) ?? 0) + valorItens(itensFiltrados(v)))
    }
    for (let i = 0; i < totalDias; i++) {
      const dia = addDias(intervalo.value.inicio, i)
      const chave = dia.toISOString().slice(0, 10)
      dias.push(formatShortDate(dia))
      const mapaForma = mapaPorDia.get(chave)
      for (const { forma } of FORMAS) {
        seriesPorForma.get(forma)!.push(Math.round((mapaForma?.get(forma) ?? 0) * 100) / 100)
      }
    }
    return {
      categorias: dias,
      series: FORMAS.map(({ forma, label }) => ({ name: label, data: seriesPorForma.get(forma)! })),
    }
  }

  function topProdutos(n: number, ordenarPor: 'faturamento' | 'quantidade' = 'faturamento') {
    const mapa = new Map<string, { quantidade: number; valor: number }>()
    for (const v of vendasConcluidas.value) {
      for (const it of itensFiltrados(v)) {
        const atual = mapa.get(it.produtoId) ?? { quantidade: 0, valor: 0 }
        atual.quantidade += it.quantidade
        atual.valor += it.quantidade * it.precoUnit
        mapa.set(it.produtoId, atual)
      }
    }
    const linhas = Array.from(mapa.entries()).map(([produtoId, agg]) => {
      const produto = store.produtoPorId(produtoId)
      const categoria = produto ? store.categoriaPorId(produto.categoriaId) : undefined
      return {
        produtoId,
        nome: produto?.nome ?? produtoId,
        categoriaNome: categoria?.nome ?? '',
        quantidade: agg.quantidade,
        valor: agg.valor,
      }
    })
    linhas.sort((a, b) => (ordenarPor === 'quantidade' ? b.quantidade - a.quantidade : b.valor - a.valor))
    return linhas.slice(0, n)
  }

  function topVendedores(n: number) {
    const mapa = new Map<string, { valor: number; nVendas: number }>()
    for (const v of vendasConcluidas.value) {
      const atual = mapa.get(v.vendedorId) ?? { valor: 0, nVendas: 0 }
      atual.valor += valorItens(itensFiltrados(v))
      atual.nVendas++
      mapa.set(v.vendedorId, atual)
    }
    const linhas = Array.from(mapa.entries()).map(([vendedorId, agg]) => {
      const vendedor = store.vendedorPorId(vendedorId)
      return {
        vendedorId,
        nome: vendedor?.nome ?? vendedorId,
        loja: vendedor?.loja ?? '',
        valor: agg.valor,
        nVendas: agg.nVendas,
      }
    })
    linhas.sort((a, b) => b.valor - a.valor)
    return linhas.slice(0, n)
  }

  function topClientes(n: number) {
    const mapa = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      if (!v.clienteId) continue
      mapa.set(v.clienteId, (mapa.get(v.clienteId) ?? 0) + valorItens(itensFiltrados(v)))
    }
    const linhas = Array.from(mapa.entries()).map(([clienteId, valor]) => {
      const cliente = store.clientePorId(clienteId)
      return { clienteId, nome: cliente?.nome ?? clienteId, ramo: cliente?.ramo ?? '', valor }
    })
    linhas.sort((a, b) => b.valor - a.valor)
    return linhas.slice(0, n)
  }

  function vendasPorCategoria() {
    const mapa = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      for (const it of itensFiltrados(v)) {
        mapa.set(it.categoriaId, (mapa.get(it.categoriaId) ?? 0) + it.quantidade * it.precoUnit)
      }
    }
    const total = Array.from(mapa.values()).reduce((a, b) => a + b, 0)
    const linhas = Array.from(mapa.entries()).map(([categoriaId, valor]) => {
      const categoria = store.categoriaPorId(categoriaId)
      return { categoriaId, nome: categoria?.nome ?? categoriaId, valor, percentual: total ? (valor / total) * 100 : 0 }
    })
    linhas.sort((a, b) => b.valor - a.valor)
    return linhas
  }

  function curvaABC() {
    const produtos = topProdutos(store.produtos.length, 'faturamento')
    const total = produtos.reduce((acc, p) => acc + p.valor, 0)
    let acumulado = 0
    const classes: ('A' | 'B' | 'C')[] = []
    const acumuladoPercentual: number[] = []
    for (const p of produtos) {
      acumulado += p.valor
      const pct = total ? (acumulado / total) * 100 : 0
      acumuladoPercentual.push(Math.round(pct * 10) / 10)
      classes.push(pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C')
    }
    return {
      categorias: produtos.map((p) => p.nome),
      valores: produtos.map((p) => p.valor),
      classes,
      acumulado: acumuladoPercentual,
      distribuicao: {
        A: classes.filter((c) => c === 'A').length,
        B: classes.filter((c) => c === 'B').length,
        C: classes.filter((c) => c === 'C').length,
      },
    }
  }

  function novosVsRecorrentes() {
    const inicio = intervalo.value.inicio
    const fim = intervalo.value.fim
    const meses: { chave: string; label: string; inicio: Date; fim: Date }[] = []
    const cursor = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1))
    while (cursor.getTime() <= fim.getTime()) {
      const inicioMes = new Date(cursor)
      const fimMes = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59, 999))
      meses.push({
        chave: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth()}`,
        label: MESES[cursor.getUTCMonth()],
        inicio: inicioMes < inicio ? inicio : inicioMes,
        fim: fimMes > fim ? fim : fimMes,
      })
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }

    const novos: number[] = []
    const recorrentes: number[] = []
    for (const mes of meses) {
      const clientesNovos = new Set<string>()
      const clientesRecorrentes = new Set<string>()
      for (const v of vendasConcluidas.value) {
        if (!v.clienteId) continue
        const t = new Date(v.dataHora).getTime()
        if (t < mes.inicio.getTime() || t > mes.fim.getTime()) continue
        const cliente = store.clientePorId(v.clienteId)
        if (!cliente) continue
        const primeiraCompraMes = new Date(cliente.primeiraCompra).getUTCMonth()
        const primeiraCompraAno = new Date(cliente.primeiraCompra).getUTCFullYear()
        const ehNovoNesteMes =
          primeiraCompraMes === new Date(mes.inicio).getUTCMonth() &&
          primeiraCompraAno === new Date(mes.inicio).getUTCFullYear()
        if (ehNovoNesteMes) clientesNovos.add(v.clienteId)
        else clientesRecorrentes.add(v.clienteId)
      }
      novos.push(clientesNovos.size)
      recorrentes.push(clientesRecorrentes.size)
    }

    return { categorias: meses.map((m) => m.label), novos, recorrentes }
  }

  function segmentacaoClientes() {
    const mapa = new Map<string, number>()
    for (const v of vendasConcluidas.value) {
      if (!v.clienteId) continue
      mapa.set(v.clienteId, (mapa.get(v.clienteId) ?? 0) + valorItens(itensFiltrados(v)))
    }
    const ordenado = Array.from(mapa.entries()).sort((a, b) => b[1] - a[1])
    const total = ordenado.length
    const corte1 = Math.ceil(total * 0.2)
    const corte2 = Math.ceil(total * 0.5)
    const contagem: Record<Segmento, number> = { vip: 0, regular: 0, ocasional: 0 }
    ordenado.forEach((_entry, i) => {
      if (i < corte1) contagem.vip++
      else if (i < corte2) contagem.regular++
      else contagem.ocasional++
    })
    return {
      vip: { count: contagem.vip, percentual: total ? (contagem.vip / total) * 100 : 0 },
      regular: { count: contagem.regular, percentual: total ? (contagem.regular / total) * 100 : 0 },
      ocasional: { count: contagem.ocasional, percentual: total ? (contagem.ocasional / total) * 100 : 0 },
    }
  }

  function comparativoPeriodos() {
    const atual = new Array(7).fill(0)
    const anterior = new Array(7).fill(0)
    for (const v of vendasConcluidas.value) {
      atual[new Date(v.dataHora).getUTCDay()] += valorItens(itensFiltrados(v))
    }
    for (const v of vendasConcluidasAnterior.value) {
      anterior[new Date(v.dataHora).getUTCDay()] += valorItens(itensFiltrados(v))
    }
    return { categorias: DIAS_SEMANA, atual, anterior }
  }

  function destaquesPeriodo() {
    let maiorVenda = 0
    for (const v of vendasConcluidas.value) {
      const valor = valorItens(itensFiltrados(v))
      if (valor > maiorVenda) maiorVenda = valor
    }
    const porDia = faturamentoPorDiaSemana()
    const melhorDiaIndex = porDia.indexOf(Math.max(...porDia))
    const horas = vendasPorHora()
    const picoIndex = horas.indexOf(Math.max(...horas))
    return {
      maiorVenda,
      melhorDia: DIAS_SEMANA[melhorDiaIndex] ?? '-',
      horarioPico: `${picoIndex}h - ${picoIndex + 2}h`,
    }
  }

  const tabelaVendas = computed<VendaExibicao[]>(() =>
    vendasFiltradas.value
      .map((v) => ({
        id: v.id,
        numero: v.numero,
        dataHora: v.dataHora,
        vendedorNome: store.vendedorPorId(v.vendedorId)?.nome ?? v.vendedorId,
        clienteNome: v.clienteId ? (store.clientePorId(v.clienteId)?.nome ?? v.clienteId) : 'Consumidor final',
        nItens: quantidadeItens(itensFiltrados(v)),
        formaPagamento: v.formaPagamento,
        total: valorItens(itensFiltrados(v)),
        status: v.status,
      }))
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora)),
  )

  function tabelaProdutos(): ProdutoTabela[] {
    const mapa = new Map<string, { quantidade: number; valor: number; custo: number }>()
    for (const v of vendasConcluidas.value) {
      for (const it of itensFiltrados(v)) {
        const atual = mapa.get(it.produtoId) ?? { quantidade: 0, valor: 0, custo: 0 }
        atual.quantidade += it.quantidade
        atual.valor += it.quantidade * it.precoUnit
        atual.custo += it.quantidade * it.custoUnit
        mapa.set(it.produtoId, atual)
      }
    }
    return store.produtos.map((produto) => {
      const agg = mapa.get(produto.id) ?? { quantidade: 0, valor: 0, custo: 0 }
      const categoria = store.categoriaPorId(produto.categoriaId)
      const margem = agg.valor > 0 ? ((agg.valor - agg.custo) / agg.valor) * 100 : 0
      return {
        produtoId: produto.id,
        sku: produto.sku,
        nome: produto.nome,
        categoriaNome: categoria?.nome ?? '',
        quantidade: agg.quantidade,
        faturamento: agg.valor,
        ticketMedio: agg.quantidade ? agg.valor / agg.quantidade : 0,
        margem,
        estoque: produto.estoque,
      }
    })
  }

  function alertaEstoque() {
    const dias = Math.max(1, Math.round((intervalo.value.fim.getTime() - intervalo.value.inicio.getTime()) / 86400000) + 1)
    const linhas = tabelaProdutos()
      .map((p) => {
        const giroDia = p.quantidade / dias
        const diasRestantes = giroDia > 0 ? p.estoque / giroDia : Infinity
        return { ...p, giroDia, diasRestantes }
      })
      .filter((p) => p.giroDia > 0 && p.diasRestantes < 7)
    linhas.sort((a, b) => a.diasRestantes - b.diasRestantes)
    return linhas
  }

  function tabelaVendedores(): VendedorTabela[] {
    const inicioMes = new Date(Date.UTC(HOJE.getUTCFullYear(), HOJE.getUTCMonth(), 1))
    const ivMes: Intervalo = { inicio: inicioMes, fim: fimDoDia(HOJE) }
    const vendasMes = vendasNoIntervalo(ivMes).filter((v) => v.status === 'concluida')

    return store.vendedores.map((vendedor) => {
      const doVendedorAtual = vendasConcluidas.value.filter((v) => v.vendedorId === vendedor.id)
      const doVendedorAnterior = vendasConcluidasAnterior.value.filter((v) => v.vendedorId === vendedor.id)
      const doVendedorMes = vendasMes.filter((v) => v.vendedorId === vendedor.id)

      const faturamentoAtualVendedor = doVendedorAtual.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0)
      const faturamentoAnteriorVendedor = doVendedorAnterior.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0)
      const faturamentoMesVendedor = doVendedorMes.reduce((acc, v) => acc + valorItens(itensFiltrados(v)), 0)

      return {
        vendedorId: vendedor.id,
        nome: vendedor.nome,
        loja: vendedor.loja,
        faturamento: faturamentoAtualVendedor,
        nVendas: doVendedorAtual.length,
        ticketMedio: doVendedorAtual.length ? faturamentoAtualVendedor / doVendedorAtual.length : 0,
        statusMeta: vendedor.metaMensal > 0 ? Math.min(100, Math.round((faturamentoMesVendedor / vendedor.metaMensal) * 100)) : 0,
        tendencia: variacaoPercentual(faturamentoAtualVendedor, faturamentoAnteriorVendedor),
      }
    })
  }

  /** Histórico mensal do faturamento da equipe (independe do período selecionado): cada mês vs. o mês anterior. */
  function desempenhoEquipeMensal() {
    const porMes = new Map<string, number>()
    for (const v of store.vendas) {
      if (v.status !== 'concluida' || !passaFiltrosBase(v)) continue
      const itens = itensFiltrados(v)
      if (itens.length === 0) continue
      const d = new Date(v.dataHora)
      const chave = `${d.getUTCFullYear()}-${d.getUTCMonth()}`
      porMes.set(chave, (porMes.get(chave) ?? 0) + valorItens(itens))
    }
    const chaves = Array.from(porMes.keys()).sort()
    const categorias = chaves.map((chave) => MESES[Number(chave.split('-')[1])])
    const atual = chaves.map((chave) => porMes.get(chave) ?? 0)
    const anterior = atual.map((_, i) => (i > 0 ? atual[i - 1] : 0))
    return { categorias, atual, anterior }
  }

  function tabelaClientes() {
    const porCliente = new Map<string, { valor: number; nCompras: number; ultimaCompra: string }>()
    for (const v of vendasConcluidas.value) {
      if (!v.clienteId) continue
      const atual = porCliente.get(v.clienteId) ?? { valor: 0, nCompras: 0, ultimaCompra: v.dataHora }
      atual.valor += valorItens(itensFiltrados(v))
      atual.nCompras++
      if (v.dataHora > atual.ultimaCompra) atual.ultimaCompra = v.dataHora
      porCliente.set(v.clienteId, atual)
    }
    const linhas = Array.from(porCliente.entries()).map(([clienteId, agg]) => {
      const cliente = store.clientePorId(clienteId)
      return {
        clienteId,
        nome: cliente?.nome ?? clienteId,
        ramo: cliente?.ramo ?? '',
        ultimaCompra: agg.ultimaCompra,
        nCompras: agg.nCompras,
        ticketMedio: agg.nCompras ? agg.valor / agg.nCompras : 0,
        totalGasto: agg.valor,
      }
    })
    linhas.sort((a, b) => b.totalGasto - a.totalGasto)
    return linhas
  }

  const clientesAtivos = computed(() => tabelaClientes().length)
  const novosClientes = computed(() => {
    let count = 0
    for (const linha of tabelaClientes()) {
      const cliente = store.clientePorId(linha.clienteId)
      if (cliente && dataDentroDoIntervalo(cliente.primeiraCompra, intervalo.value)) count++
    }
    return count
  })
  const taxaRecompra = computed(() => {
    const linhas = tabelaClientes()
    if (linhas.length === 0) return 0
    const recompra = linhas.filter((l) => l.nCompras > 1).length
    return (recompra / linhas.length) * 100
  })

  return {
    intervalo,
    intervaloAnterior,
    kpisGerais,
    metaDoMes,
    serieTemporalFaturamento,
    serieTemporalNumeroVendas,
    vendasPorDiaSemana,
    vendasPorHora,
    porFormaPagamento,
    evolucaoDiariaPorFormaPagamento,
    topProdutos,
    topVendedores,
    topClientes,
    vendasPorCategoria,
    curvaABC,
    novosVsRecorrentes,
    segmentacaoClientes,
    comparativoPeriodos,
    destaquesPeriodo,
    tabelaVendas,
    tabelaProdutos,
    tabelaVendedores,
    desempenhoEquipeMensal,
    tabelaClientes,
    alertaEstoque,
    clientesAtivos,
    novosClientes,
    taxaRecompra,
  }
}
