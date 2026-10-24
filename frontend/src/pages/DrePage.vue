<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { getDre, type DreResultado } from '@/services/dataService'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { exportarCsv } from '@/utils/exportar'

const filters = useFiltersStore()
const dre = ref<DreResultado | null>(null)
const carregando = ref(false)
const erro = ref('')

// Seletor de Competência
type TipoCompetencia = 'mensal' | 'trimestral' | 'anual'
const tipoCompetencia = ref<TipoCompetencia>('mensal')

// Ano selecionado (default atual)
const anoAtual = new Date().getFullYear()
const anoSelecionado = ref(anoAtual)

// Mês selecionado (1 a 12)
const mesSelecionado = ref(new Date().getMonth() + 1)

// Trimestre selecionado (1 a 4)
const trimestreSelecionado = ref(Math.ceil((new Date().getMonth() + 1) / 3))

// Modo comparativo: 'anterior' (imediato anterior) ou 'yoy' (mesmo período do ano anterior)
const modoComparativo = ref<'anterior' | 'yoy'>('anterior')

function formatar2Digitos(n: number) {
  return n.toString().padStart(2, '0')
}

// Calcula as datas de início e fim atual e comparativo
const periodosCalculados = computed(() => {
  let inicio = ''
  let fim = ''
  let inicioAnt = ''
  let fimAnt = ''

  const ano = anoSelecionado.value

  if (tipoCompetencia.value === 'mensal') {
    const mes = mesSelecionado.value
    const ultimoDia = new Date(ano, mes, 0).getDate()
    inicio = `${ano}-${formatar2Digitos(mes)}-01`
    fim = `${ano}-${formatar2Digitos(mes)}-${formatar2Digitos(ultimoDia)}`

    if (modoComparativo.value === 'yoy') {
      const anoAnt = ano - 1
      const ultimoDiaAnt = new Date(anoAnt, mes, 0).getDate()
      inicioAnt = `${anoAnt}-${formatar2Digitos(mes)}-01`
      fimAnt = `${anoAnt}-${formatar2Digitos(mes)}-${formatar2Digitos(ultimoDiaAnt)}`
    } else {
      // Mês imediatamente anterior
      const mesAnt = mes === 1 ? 12 : mes - 1
      const anoAnt = mes === 1 ? ano - 1 : ano
      const ultimoDiaAnt = new Date(anoAnt, mesAnt, 0).getDate()
      inicioAnt = `${anoAnt}-${formatar2Digitos(mesAnt)}-01`
      fimAnt = `${anoAnt}-${formatar2Digitos(mesAnt)}-${formatar2Digitos(ultimoDiaAnt)}`
    }
  } else if (tipoCompetencia.value === 'trimestral') {
    const trim = trimestreSelecionado.value
    const mesInicio = (trim - 1) * 3 + 1
    const mesFim = trim * 3
    const ultimoDia = new Date(ano, mesFim, 0).getDate()
    inicio = `${ano}-${formatar2Digitos(mesInicio)}-01`
    fim = `${ano}-${formatar2Digitos(mesFim)}-${formatar2Digitos(ultimoDia)}`

    if (modoComparativo.value === 'yoy') {
      const anoAnt = ano - 1
      const ultimoDiaAnt = new Date(anoAnt, mesFim, 0).getDate()
      inicioAnt = `${anoAnt}-${formatar2Digitos(mesInicio)}-01`
      fimAnt = `${anoAnt}-${formatar2Digitos(mesFim)}-${formatar2Digitos(ultimoDiaAnt)}`
    } else {
      // Trimestre imediatamente anterior
      const trimAnt = trim === 1 ? 4 : trim - 1
      const anoAnt = trim === 1 ? ano - 1 : ano
      const mesIniAnt = (trimAnt - 1) * 3 + 1
      const mesFimAnt = trimAnt * 3
      const ultimoDiaAnt = new Date(anoAnt, mesFimAnt, 0).getDate()
      inicioAnt = `${anoAnt}-${formatar2Digitos(mesIniAnt)}-01`
      fimAnt = `${anoAnt}-${formatar2Digitos(mesFimAnt)}-${formatar2Digitos(ultimoDiaAnt)}`
    }
  } else {
    // Anual
    inicio = `${ano}-01-01`
    fim = `${ano}-12-31`
    inicioAnt = `${ano - 1}-01-01`
    fimAnt = `${ano - 1}-12-31`
  }

  return { inicio, fim, inicioAnt, fimAnt }
})

async function carregarDre() {
  carregando.value = true
  erro.value = ''
  try {
    const { inicio, fim, inicioAnt, fimAnt } = periodosCalculados.value
    const idsLojas = filters.lojasSelecionadas.join(',')
    const res = await getDre(inicio, fim, inicioAnt, fimAnt, idsLojas)
    dre.value = res
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Falha ao processar DRE.'
  } finally {
    carregando.value = false
  }
}

watch(
  () => [
    tipoCompetencia.value,
    anoSelecionado.value,
    mesSelecionado.value,
    trimestreSelecionado.value,
    modoComparativo.value,
    filters.lojasSelecionadas.join(','),
  ],
  () => {
    void carregarDre()
  },
)

onMounted(() => {
  void carregarDre()
})

const kpis = computed(() => dre.value?.kpis)

// Gráfico comparativo de componentes principais
const categoriasGrafico = ['Receita Líquida', 'Custos (CMV)', 'Lucro Bruto', 'Despesas Oper.', 'Resultado Líquido']
const seriesGrafico = computed(() => {
  if (!dre.value) return []
  const l = dre.value.linhas
  const getVal = (cod: string, tipo: 'atual' | 'ant') => {
    const linha = l.find((x) => x.codigo === cod)
    if (!linha) return 0
    return tipo === 'atual' ? Math.abs(linha.valorAtual) : Math.abs(linha.valorAnterior)
  }

  return [
    {
      name: 'Período Atual',
      data: [
        getVal('2', 'atual'),
        getVal('2.1', 'atual'),
        getVal('3', 'atual'),
        getVal('3.1', 'atual'),
        dre.value.kpis.resultadoLiquido,
      ],
    },
    {
      name: modoComparativo.value === 'yoy' ? 'Ano Anterior (YoY)' : 'Período Anterior',
      data: [
        getVal('2', 'ant'),
        getVal('2.1', 'ant'),
        getVal('3', 'ant'),
        getVal('3.1', 'ant'),
        l.find((x) => x.codigo === '4')?.valorAnterior ?? 0,
      ],
    },
  ]
})

function rotuloVariacao(varPerc: number): string {
  if (varPerc > 0) return `+${formatPercent(varPerc, true)}`
  return formatPercent(varPerc, true)
}

function dispararExportacaoCsv() {
  if (!dre.value?.linhas.length) return
  const colunas = [
    { chave: 'conta', rotulo: 'Conta / Descrição' },
    { chave: 'valorAtual', rotulo: `Período Atual (${dre.value.periodoAtual.inicio} a ${dre.value.periodoAtual.fim})` },
    { chave: 'avAtual', rotulo: 'AV % Atual' },
    { chave: 'valorAnt', rotulo: `Período Comparativo (${dre.value.periodoAnterior.inicio} a ${dre.value.periodoAnterior.fim})` },
    { chave: 'avAnt', rotulo: 'AV % Anterior' },
    { chave: 'varNom', rotulo: 'Variação Nominal (R$)' },
    { chave: 'varPerc', rotulo: 'Variação % (AH)' },
  ]

  const linhas = dre.value.linhas.map((l) => ({
    conta: l.descricao,
    valorAtual: formatCurrency(l.valorAtual),
    avAtual: l.tipo === 'RECEITA' || l.tipo === 'SUBTOTAL' || l.tipo === 'RESULTADO' ? `${l.percentualVerticalAtual}%` : `-${l.percentualVerticalAtual}%`,
    valorAnt: formatCurrency(l.valorAnterior),
    avAnt: `${l.percentualVerticalAnterior}%`,
    varNom: formatCurrency(l.variacaoNominal),
    varPerc: `${l.variacaoPercentual}%`,
  }))

  exportarCsv(`dre-${dre.value.periodoAtual.inicio}-${dre.value.periodoAtual.fim}`, colunas, linhas)
}

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="DRE — Demonstrativo do Resultado do Exercício" />

    <!-- Barra de Filtros e Seletores de Competência -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <StoreFilter />

        <!-- Seletor de Tipo de Competência -->
        <div class="inline-flex rounded-btn border border-surface-border bg-surface p-1 shadow-xs">
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="tipoCompetencia === 'mensal' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="tipoCompetencia = 'mensal'"
          >
            Mensal
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="tipoCompetencia === 'trimestral' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="tipoCompetencia = 'trimestral'"
          >
            Trimestral
          </button>
          <button
            class="rounded px-3 py-1 text-xs font-semibold transition-colors"
            :class="tipoCompetencia === 'anual' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="tipoCompetencia = 'anual'"
          >
            Anual
          </button>
        </div>

        <!-- Seletor de Mês (quando mensal) -->
        <select
          v-if="tipoCompetencia === 'mensal'"
          v-model="mesSelecionado"
          class="rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs"
        >
          <option v-for="(nome, idx) in mesesNomes" :key="idx" :value="idx + 1">
            {{ nome }}
          </option>
        </select>

        <!-- Seletor de Trimestre (quando trimestral) -->
        <select
          v-if="tipoCompetencia === 'trimestral'"
          v-model="trimestreSelecionado"
          class="rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs"
        >
          <option :value="1">1º Trimestre (Jan - Mar)</option>
          <option :value="2">2º Trimestre (Abr - Jun)</option>
          <option :value="3">3º Trimestre (Jul - Set)</option>
          <option :value="4">4º Trimestre (Out - Dez)</option>
        </select>

        <!-- Seletor de Ano -->
        <select
          v-model="anoSelecionado"
          class="rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs"
        >
          <option :value="anoAtual">{{ anoAtual }}</option>
          <option :value="anoAtual - 1">{{ anoAtual - 1 }}</option>
          <option :value="anoAtual - 2">{{ anoAtual - 2 }}</option>
        </select>

        <!-- Modo Comparativo -->
        <div class="inline-flex rounded-btn border border-surface-border bg-surface p-1 shadow-xs">
          <button
            class="rounded px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="modoComparativo === 'anterior' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="modoComparativo = 'anterior'"
          >
            Mês/Período Anterior
          </button>
          <button
            class="rounded px-2.5 py-1 text-xs font-semibold transition-colors"
            :class="modoComparativo === 'yoy' ? 'bg-brand-900 text-white' : 'text-ink-muted hover:text-ink'"
            @click="modoComparativo = 'yoy'"
          >
            Ano Anterior (YoY)
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          icon="bi-download"
          :disabled="!dre?.linhas.length"
          @click="dispararExportacaoCsv"
        >
          Exportar CSV
        </BaseButton>
        <BaseButton
          variant="secondary"
          icon="bi-arrow-clockwise"
          :loading="carregando"
          @click="carregarDre"
        >
          Atualizar
        </BaseButton>
      </div>
    </div>

    <!-- 4 KPIs Executivos do DRE -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Receita Líquida"
        :value="kpis ? formatCurrency(kpis.receitaLiquida) : '—'"
        icon="bi-cash-coin"
        :highlight="true"
        suffix="Vendas brutas menos cancelamentos"
      />
      <KpiCard
        label="Lucro Bruto"
        :value="kpis ? formatCurrency(kpis.lucroBruto) : '—'"
        icon="bi-pie-chart-fill"
        :badge="kpis ? `Margem: ${formatPercent(kpis.margemBruta, true)}` : undefined"
        badge-variant="green"
        suffix="Margem de contribuição (Receita - CMV)"
      />
      <KpiCard
        label="Despesas Operacionais"
        :value="kpis ? formatCurrency(kpis.despesasOperacionais) : '—'"
        icon="bi-calculator-fill"
        suffix="Baseado em contas a pagar do período"
      />
      <KpiCard
        label="Resultado Líquido"
        :value="kpis ? formatCurrency(kpis.resultadoLiquido) : '—'"
        icon="bi-trophy-fill"
        :badge="kpis ? `Margem Líq: ${formatPercent(kpis.margemLiquida, true)}` : undefined"
        :badge-variant="kpis && kpis.resultadoLiquido >= 0 ? 'green' : 'amber'"
        suffix="Lucro ou prejuízo líquido consolidado"
      />
    </div>

    <!-- Gráfico Comparativo de Estrutura de Resultados -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4">
        <h2 class="text-base font-bold text-ink">Comparativo de Resultados</h2>
        <p class="text-xs text-ink-muted">
          Período Atual ({{ dre?.periodoAtual.inicio }} a {{ dre?.periodoAtual.fim }}) vs Comparativo ({{ dre?.periodoAnterior.inicio }} a {{ dre?.periodoAnterior.fim }})
        </p>
      </div>

      <div v-if="carregando && !dre" class="py-12">
        <SkeletonCard variant="chart" :height="260" />
      </div>
      <EmptyState
        v-else-if="!seriesGrafico.length"
        icon="bi-bar-chart"
        title="Sem dados para compor o gráfico"
        description="Nenhuma movimentação financeira no período selecionado."
      />
      <div v-else class="h-[280px]">
        <BarChart
          :categories="categoriasGrafico"
          :series="seriesGrafico"
          :height="260"
          :stacked="false"
          :value-formatter="formatCurrency"
        />
      </div>
    </div>

    <!-- Tabela Analítica de DRE Contábil -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-base font-bold text-ink">Estrutura do DRE Consolidado</h2>
          <p class="text-xs text-ink-muted">
            Análise Vertical (AV % sobre Receita Líquida) e Análise Horizontal (AH Variação % e Nominal)
          </p>
        </div>
      </div>

      <div v-if="carregando && !dre" class="space-y-2">
        <SkeletonCard v-for="i in 7" :key="i" variant="table-row" />
      </div>

      <EmptyState
        v-else-if="erro"
        icon="bi-exclamation-triangle"
        title="Não foi possível consolidar o DRE"
        :description="erro"
      >
        <BaseButton variant="secondary" class="mt-3" @click="carregarDre">
          Tentar novamente
        </BaseButton>
      </EmptyState>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-surface-border text-xs uppercase tracking-wider text-ink-muted">
              <th class="py-3 pl-4 pr-3 font-semibold">Conta / Descrição</th>
              <th class="py-3 px-3 text-right font-semibold">Período Atual</th>
              <th class="py-3 px-3 text-right font-semibold">AV %</th>
              <th class="py-3 px-3 text-right font-semibold">Período Anterior</th>
              <th class="py-3 px-3 text-right font-semibold">AV % Ant</th>
              <th class="py-3 px-3 text-right font-semibold">Var. Nominal (R$)</th>
              <th class="py-3 pl-3 pr-4 text-right font-semibold">Var. % (AH)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-border/50">
            <tr
              v-for="l in dre?.linhas ?? []"
              :key="l.codigo"
              class="transition-colors hover:bg-surface-bg/50"
              :class="{
                'bg-brand-50/40 font-bold text-brand-900': l.tipo === 'SUBTOTAL',
                'bg-brand-100/60 font-bold text-ink text-base': l.tipo === 'RESULTADO',
                'font-medium text-ink': l.tipo === 'RECEITA',
                'text-ink-muted': l.tipo === 'DEDUCAO' || l.tipo === 'CUSTO' || l.tipo === 'DESPESA',
              }"
            >
              <td class="py-3 pl-4 pr-3">
                <span :class="l.codigo.includes('.') ? 'pl-4' : ''">{{ l.descricao }}</span>
              </td>
              <td
                class="py-3 px-3 text-right"
                :class="l.valorAtual < 0 ? 'text-danger-700' : ''"
              >
                {{ formatCurrency(l.valorAtual) }}
              </td>
              <td class="py-3 px-3 text-right text-xs">
                {{ l.percentualVerticalAtual ? `${l.percentualVerticalAtual}%` : '—' }}
              </td>
              <td
                class="py-3 px-3 text-right"
                :class="l.valorAnterior < 0 ? 'text-danger-700' : ''"
              >
                {{ formatCurrency(l.valorAnterior) }}
              </td>
              <td class="py-3 px-3 text-right text-xs text-ink-muted">
                {{ l.percentualVerticalAnterior ? `${l.percentualVerticalAnterior}%` : '—' }}
              </td>
              <td
                class="py-3 px-3 text-right text-xs"
                :class="l.variacaoNominal > 0 ? 'text-green-700 font-semibold' : l.variacaoNominal < 0 ? 'text-danger-700 font-semibold' : 'text-ink-muted'"
              >
                {{ l.variacaoNominal > 0 ? '+' : '' }}{{ formatCurrency(l.variacaoNominal) }}
              </td>
              <td class="py-3 pl-3 pr-4 text-right">
                <span
                  class="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                  :class="{
                    'bg-green-100 text-green-800': l.variacaoPercentual > 0 && l.tipo !== 'CUSTO' && l.tipo !== 'DESPESA',
                    'bg-danger-100 text-danger-800': l.variacaoPercentual < 0 && l.tipo !== 'CUSTO' && l.tipo !== 'DESPESA',
                    'bg-amber-100 text-amber-800': l.variacaoPercentual > 0 && (l.tipo === 'CUSTO' || l.tipo === 'DESPESA'),
                    'bg-surface-bg text-ink-muted': l.variacaoPercentual === 0,
                  }"
                >
                  {{ rotuloVariacao(l.variacaoPercentual) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
