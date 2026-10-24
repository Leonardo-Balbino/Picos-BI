<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { BarChart, HBarChart } from '@/components/charts/lazy'
import { useVendasStore } from '@/stores/useVendasStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useExportStore } from '@/stores/useExportStore'
import { useLojasStore } from '@/stores/useLojasStore'
import { useAggregations } from '@/composables/useAggregations'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { formatCurrency, formatCompact, formatNumber, formatDate } from '@/utils/formatters'

const vendas = useVendasStore()
const auth = useAuthStore()
const filters = useFiltersStore()
const lojas = useLojasStore()
const exportacao = useExportStore()
const agg = useAggregations()
const { forcarAtualizacao, periodoAtualISO } = useRecarregarDados()
const kpis = agg.kpisGerais
const formatarMargem = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
const diaSemana = computed(() => agg.vendasPorDiaSemana())
const porHora = computed(() => agg.vendasPorHora())
const vendasDiarias = computed(() => agg.serieTemporalFaturamento(false))

function carregarTopProdutos() {
  const { inicio, fim } = periodoAtualISO()
  vendas.carregarItensVendidos(inicio, fim, filters.lojasSelecionadas.slice().sort().join(','))
}
watch(
  () => [filters.periodo, filters.range.inicio, filters.range.fim, filters.lojasSelecionadas.join(','), vendas.revisao],
  carregarTopProdutos,
  { immediate: true },
)

const topProdutos = computed(() => agg.topItensVendidos(10))
const diaMaiorVenda = computed(() => {
  const vals = vendasDiarias.value.valores
  const max = Math.max(0, ...vals)
  if (max <= 0) return null
  const idx = vals.indexOf(max)
  return { dia: vendasDiarias.value.categorias[idx] ?? '', valor: max }
})

const modoTv = ref(false)
const nome = computed(() => auth.usuario?.nome?.split(' ')[0] || 'bem-vindo')
const tituloPeriodo = computed(() => {
  if (filters.periodo === 'dia') return 'Vendas hoje'
  if (filters.periodo === 'dia-anterior') return 'Vendas no dia anterior'
  if (filters.periodo === 'personalizado' && filters.range.inicio && filters.range.inicio === filters.range.fim) {
    return 'Vendas em ' + formatDate(filters.range.inicio)
  }
  return 'Vendas no período'
})
const contexto = computed(() => {
  const lista = lojas.lojas.filter((l) => !filters.lojasSelecionadas.length || filters.lojasSelecionadas.includes(l.id))
  return lista.length === 1 ? lista[0]!.nome : lista.length + ' unidades selecionadas'
})
const intervalo = computed(() => {
  const f = (d: Date) => d.toLocaleDateString('pt-BR')
  return f(agg.intervalo.value.inicio) + ' a ' + f(agg.intervalo.value.fim)
})
const linhaTendencia = computed(() => {
  const valores = agg.serieTemporalFaturamento().valores
  const max = Math.max(1, ...valores)
  return valores.map((v, i) => ((i / Math.max(1, valores.length - 1)) * 280).toFixed(1) + ',' + (65 - v / max * 58).toFixed(1)).join(' ')
})
function sairTelaCheia() { if (!document.fullscreenElement) modoTv.value = false }
function alternarModoTv() {
  modoTv.value = !modoTv.value
  if (modoTv.value) document.documentElement.requestFullscreen?.().catch(() => {})
  else if (document.fullscreenElement) void document.exitFullscreen()
}
onMounted(() => document.addEventListener('fullscreenchange', sairTelaCheia))
onUnmounted(() => {
  document.removeEventListener('fullscreenchange', sairTelaCheia)
  if (modoTv.value && document.fullscreenElement) void document.exitFullscreen()
})
watchEffect(() => exportacao.registrar('painel-executivo', [
  { chave: 'indicador', rotulo: 'Indicador' }, { chave: 'valor', rotulo: 'Valor' }, { chave: 'detalhe', rotulo: 'Detalhe' },
], [
  { indicador: tituloPeriodo.value, valor: formatCurrency(kpis.value.totalPeriodo), detalhe: contexto.value + ' · ' + intervalo.value },
  { indicador: 'Vendas elegíveis', valor: formatNumber(kpis.value.numeroVendas), detalhe: intervalo.value },
  { indicador: 'Ticket médio', valor: formatCurrency(kpis.value.ticketMedio), detalhe: intervalo.value },
  ...vendasDiarias.value.categorias.map((dia, i) => ({ indicador: dia, valor: formatCurrency(vendasDiarias.value.valores[i] ?? 0), detalhe: 'Total vendido no dia' })),
  ...topProdutos.value.map((p, i) => ({ indicador: `${i + 1}º Produto mais vendido`, valor: formatCurrency(p.valTotalLiquido), detalhe: `${p.descricao} (${formatNumber(p.qtd)} un)` })),
]))
</script>

<template>
  <div class="executive-dashboard" :class="{ 'executive-tv': modoTv }">
    <GlobalFilters />
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="mb-1 text-xs font-bold uppercase tracking-widest text-brand-600">Picos Analytics · Painel executivo</p>
        <h1 class="text-2xl font-bold text-ink sm:text-3xl">Olá, {{ nome }} <span aria-hidden="true">👋</span></h1>
        <p class="mt-1 text-sm text-ink-muted">Aqui está o resumo do seu negócio.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink to="/vendas" class="executive-action"><i class="bi bi-clock-history" /> Ver histórico</RouterLink>
        <button class="executive-action" type="button" @click="alternarModoTv"><i class="bi bi-tv" /> {{ modoTv ? 'Sair do modo TV' : 'Modo TV' }}</button>
      </div>
    </div>

    <div v-if="vendas.carregando" class="grid gap-4 md:grid-cols-3" aria-label="Carregando indicadores">
      <SkeletonCard v-for="i in 3" :key="i" variant="kpi" />
    </div>
    <EmptyState v-else-if="vendas.erro" title="Não foi possível carregar os indicadores" :description="vendas.erro">
      <BaseButton class="mt-3" variant="secondary" @click="forcarAtualizacao">Tentar novamente</BaseButton>
    </EmptyState>
    <template v-else>
      <section class="executive-hero" aria-label="Resumo de vendas">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-semibold uppercase tracking-wider text-white/85"><i class="bi bi-bar-chart-fill mr-2" />{{ tituloPeriodo }}</p>
          <RouterLink to="/vendas" class="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white">Ver detalhes <i class="bi bi-arrow-up-right ml-1" /></RouterLink>
        </div>
        <div class="mt-6 grid items-end gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <p class="hero-value">{{ formatCurrency(kpis.totalPeriodo) }}</p>
            <p class="mt-3 text-sm text-white/80">{{ contexto }}</p>
            <p class="mt-1 text-xs text-white/65">{{ intervalo }} · valores do período selecionado</p>
          </div>
          <svg v-if="kpis.numeroVendas > 0" class="hidden h-20 w-full lg:block" viewBox="0 0 280 75" role="img" aria-label="Evolução do faturamento no período">
            <polyline :points="linhaTendencia" fill="none" stroke="#86efac" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
        </div>

      </section>

      <div class="mb-3 mt-7 flex items-center justify-between">
        <h2 class="text-sm font-bold uppercase tracking-wider text-ink-muted">Indicadores principais</h2>
        <RouterLink to="/pagamentos" class="text-xs font-semibold text-brand-700">Ver pagamentos <i class="bi bi-chevron-right" /></RouterLink>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <RouterLink to="/vendas" class="metric-tile metric-green">
          <span><i class="bi bi-cash-stack mr-1" />Faturamento</span>
          <strong>{{ formatCurrency(kpis.totalPeriodo) }}</strong>
          <small>Vendas elegíveis no período</small>
        </RouterLink>
        <RouterLink to="/vendas" class="metric-tile metric-orange">
          <span><i class="bi bi-receipt mr-1" />Quantidade de vendas</span>
          <strong>{{ formatNumber(kpis.numeroVendas) }}</strong>
          <small>Documentos com valor positivo</small>
        </RouterLink>
        <RouterLink to="/vendas" class="metric-tile metric-purple">
          <span><i class="bi bi-ticket-perforated mr-1" />Ticket médio</span>
          <strong>{{ formatCurrency(kpis.ticketMedio) }}</strong>
          <small>Faturamento ÷ vendas elegíveis</small>
        </RouterLink>
      </div>

      <section class="mt-4" aria-label="Lucro e custos do período">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="metric-tile metric-green">
            <span><i class="bi bi-graph-up-arrow mr-1" />Lucro bruto</span>
            <strong>{{ kpis.lucroBruto == null ? 'Indisponível' : formatCurrency(kpis.lucroBruto) }}</strong>
            <small>{{ kpis.margemLucro == null ? 'Aguardando custos completos' : 'Margem de ' + formatarMargem(kpis.margemLucro) }}</small>
          </div>
          <div class="metric-tile metric-purple">
            <span><i class="bi bi-calculator mr-1" />Custo total das vendas</span>
            <strong>{{ kpis.custoTotal == null ? 'Indisponível' : formatCurrency(kpis.custoTotal) }}</strong>
            <small>Custos registrados nos itens vendidos no período</small>
          </div>
        </div>
        <p v-if="kpis.vendasSemCusto > 0" class="mt-2 text-xs text-ink-muted">{{ formatNumber(kpis.vendasSemCusto) }} venda(s) ainda sem custo completo no período.</p>
      </section>

      <div class="mt-6 grid gap-5 xl:grid-cols-2">
        <section class="executive-chart">
          <h2>Faturamento por dia da semana</h2>
          <p class="chart-description">Total de cada dia da semana no período selecionado.</p>
          <p v-if="kpis.numeroVendas" class="chart-highlight text-orange-800">Maior faturamento: {{ diaSemana.diaMaiorFaturamento }} · {{ formatCurrency(diaSemana.valorMaiorFaturamento) }}</p>
          <EmptyState v-if="!kpis.numeroVendas" title="Sem vendas no período" />
          <BarChart v-else :categories="diaSemana.categorias" :series="[{ name: 'Faturamento', data: diaSemana.valores }]" :highlight-index="diaSemana.highlightIndex" highlight-color="#f97316" base-color="#ddd3eb" :value-formatter="formatCompact" :height="modoTv ? 340 : 290" />
        </section>
        <section class="executive-chart">
          <h2>Faturamento por horário</h2>
          <p class="chart-description">Faixa entre a primeira e a última hora com vendas.</p>
          <p v-if="kpis.numeroVendas" class="chart-highlight text-emerald-800">Horário de pico: {{ porHora.horaPico }} · {{ formatCurrency(porHora.valorPico) }}</p>
          <EmptyState v-if="!kpis.numeroVendas" title="Sem vendas no período" />
          <BarChart v-else :categories="porHora.categorias" :series="[{ name: 'Faturamento', data: porHora.valores }]" :highlight-index="porHora.highlightIndex" highlight-color="#16a34a" base-color="#bbdfc9" :value-formatter="formatCompact" :height="modoTv ? 340 : 290" />
        </section>
      </div>

      <div class="mt-6 grid gap-5 xl:grid-cols-2">
        <section class="executive-chart" aria-labelledby="titulo-vendas-diarias">
          <div class="flex items-center justify-between">
            <h2 id="titulo-vendas-diarias">Total vendido por dia</h2>
          </div>
          <p class="chart-description">Faturamento diário no período selecionado.</p>
          <p v-if="kpis.numeroVendas && diaMaiorVenda" class="chart-highlight text-emerald-800">
            Melhor dia: {{ diaMaiorVenda.dia }} · {{ formatCurrency(diaMaiorVenda.valor) }}
          </p>
          <EmptyState v-if="!kpis.numeroVendas" title="Sem vendas no período" />
          <BarChart v-else :categories="vendasDiarias.categorias" :series="[{ name: 'Total vendido', data: vendasDiarias.valores }]" :value-formatter="formatCompact" :highlight-index="-1" base-color="#36b998" :height="modoTv ? 380 : 320" />
        </section>

        <section class="executive-chart" aria-labelledby="titulo-produtos-mais-vendidos">
          <div class="flex items-center justify-between">
            <div>
              <h2 id="titulo-produtos-mais-vendidos">Produtos mais vendidos</h2>
              <p class="chart-description">Top 10 produtos em faturamento no período selecionado.</p>
            </div>
            <span v-if="topProdutos.length" class="text-xs font-semibold text-brand-700">Top {{ topProdutos.length }}</span>
          </div>
          <p v-if="topProdutos.length" class="chart-highlight truncate text-brand-800">
            1º lugar: {{ topProdutos[0].descricao }} · {{ formatCurrency(topProdutos[0].valTotalLiquido) }} ({{ formatNumber(topProdutos[0].qtd) }} un)
          </p>
          <div v-if="vendas.carregandoItensVendidos" class="space-y-3 pt-4">
            <SkeletonCard v-for="i in 5" :key="i" variant="table-row" />
          </div>
          <EmptyState
            v-else-if="vendas.erroItensVendidos"
            icon="bi-exclamation-triangle"
            title="Não foi possível carregar os produtos vendidos"
            :description="vendas.erroItensVendidos"
          >
            <BaseButton variant="secondary" class="mt-3" @click="carregarTopProdutos">Tentar novamente</BaseButton>
          </EmptyState>
          <EmptyState v-else-if="topProdutos.length === 0" title="Sem vendas de produtos no período" />
          <HBarChart
            v-else
            :categories="topProdutos.map((p) => p.descricao)"
            :series="[{ name: 'Faturamento', data: topProdutos.map((p) => p.valTotalLiquido) }]"
            :value-formatter="formatCompact"
            :height="modoTv ? 380 : 320"
          />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.executive-dashboard { max-width: 1600px; margin: 0 auto; }
.executive-action { display: inline-flex; gap: .5rem; align-items: center; padding: .7rem 1rem; border: 1px solid #e2dfe8; border-radius: 14px; background: white; color: #452c63; font-size: .8rem; font-weight: 600; }
.executive-hero { background: radial-gradient(ellipse at top right, #684a91 0, transparent 55%), linear-gradient(125deg, #563575, #342044 70%); border-radius: 28px; padding: clamp(1.4rem, 3vw, 2.3rem); color: white; box-shadow: 0 14px 35px #452c631a; }
.hero-value { font-size: clamp(2rem, 4vw, 3.6rem); font-weight: 800; line-height: 1.12; letter-spacing: -.04em; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.metric-tile { display: flex; flex-direction: column; gap: .65rem; padding: 1.25rem; border-radius: 22px; min-width: 0; }
.metric-tile span { font-size: .8rem; font-weight: 600; }
.metric-tile strong { font-size: clamp(1.15rem, 2vw, 1.6rem); line-height: 1.2; font-weight: 800; overflow-wrap: anywhere; }
.metric-tile small { font-size: .67rem; line-height: 1.5; }
.metric-green { background: linear-gradient(120deg, #15803d, #21a35c); color: white; }
.metric-orange { background: linear-gradient(120deg, #f97316, #fbbf24); color: #422006; }
.metric-purple { background: #eee7f7; color: #452c63; }
.metric-neutral { border: 1px solid #e2dfe8; background: white; color: #452c63; }
.executive-chart { min-width: 0; padding: 1.4rem; background: white; border: 1px solid #e2dfe888; border-radius: 22px; }
.executive-chart h2 { color: #2e1f42; font-size: 1rem; font-weight: 700; }
.chart-description { margin-top: .35rem; font-size: .75rem; color: #6b6478; }
.chart-highlight { margin-top: .75rem; font-size: .75rem; font-weight: 600; }
.executive-tv { position: fixed; inset: 0; z-index: 35; padding: 2rem; background: #f6f4f8; overflow-y: auto; max-width: none; }
.executive-tv .hero-value { font-size: clamp(3rem, 5vw, 5rem); }
@media (max-width: 480px) { .metric-tile { padding: 1rem; } .executive-chart { padding: 1rem; } }
</style>
