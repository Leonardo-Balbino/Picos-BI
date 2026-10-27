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
const despesasExpandidas = ref(true)

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
const despesasDetalhadas = computed(() => dre.value?.despesasDetalhadas ?? [])

// Gráfico comparativo da estrutura simplificada em 4 partes
const categoriasGrafico = ['1. Receita', '2. Custos', '3. Despesas', '4. Resultado Líquido']
const seriesGrafico = computed(() => {
  if (!dre.value) return []
  const k = dre.value.kpis
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
        k.receitaLiquida,
        getVal('2', 'atual'),
        k.despesasOperacionais,
        k.resultadoLiquido,
      ],
    },
    {
      name: modoComparativo.value === 'yoy' ? 'Ano Anterior (YoY)' : 'Período Anterior',
      data: [
        getVal('1', 'ant'),
        getVal('2', 'ant'),
        getVal('3', 'ant'),
        l.find((x) => x.codigo === '4')?.valorAnterior ?? 0,
      ],
    },
  ]
})

function dispararExportacaoCsv() {
  if (!dre.value) return
  const colunas = [
    { chave: 'conta', rotulo: 'ESTRUTURA / PLANO DE CONTAS' },
    { chave: 'valorAtual', rotulo: `PERÍODO ATUAL (R$) (${dre.value.periodoAtual.inicio} a ${dre.value.periodoAtual.fim})` },
    { chave: 'avAtual', rotulo: '% SOBRE A RECEITA (AV %)' },
  ]

  const rl = dre.value.kpis.receitaLiquida || 0
  const linhas: { conta: string; valorAtual: string; avAtual: string }[] = []

  // 1. Receita
  linhas.push({
    conta: '1. Receita',
    valorAtual: formatCurrency(dre.value.kpis.receitaLiquida),
    avAtual: '100,00%',
  })

  // 2. Custos
  const linhaCustos = dre.value.linhas.find((l) => l.codigo === '2')
  linhas.push({
    conta: '2. (-) Custos (CMV)',
    valorAtual: formatCurrency(linhaCustos?.valorAtual ?? 0),
    avAtual: linhaCustos?.percentualVerticalAtual ? `${linhaCustos.percentualVerticalAtual}%` : '—',
  })

  // 3. Despesas
  linhas.push({
    conta: '3. (-) Despesas Operacionais',
    valorAtual: formatCurrency(-(dre.value.kpis.despesasOperacionais ?? 0)),
    avAtual: rl > 0 ? `${((dre.value.kpis.despesasOperacionais / rl) * 100).toFixed(2)}%` : '—',
  })

  // 3.x Plano de Contas
  for (const d of despesasDetalhadas.value) {
    linhas.push({
      conta: `   ↳ [Plano] ${d.descricao}`,
      valorAtual: formatCurrency(-d.valorAtual),
      avAtual: rl > 0 ? `${((d.valorAtual / rl) * 100).toFixed(2)}%` : '—',
    })
  }

  // 4. Resultado Líquido
  linhas.push({
    conta: '4. (=) Resultado Líquido',
    valorAtual: formatCurrency(dre.value.kpis.resultadoLiquido),
    avAtual: dre.value.kpis.margemLiquida ? `${dre.value.kpis.margemLiquida}%` : '—',
  })

  exportarCsv(`dre-${dre.value.periodoAtual.inicio}-${dre.value.periodoAtual.fim}`, colunas, linhas)
}

const mesesNomes = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="DRE — Demonstrativo do Resultado do Exercício"
      subtitle="Estrutura consolidada de apuração de resultados (Receita, Custos, Despesas e Resultado Líquido)."
    />

    <!-- Barra de Filtros e Seletores de Competência -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-card bg-surface p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-2.5">
        <StoreFilter />

        <!-- Seletor de Tipo de Competência -->
        <div class="inline-flex rounded-btn border border-surface-border bg-surface-bg p-1 shadow-xs">
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
            :class="tipoCompetencia === 'mensal' ? 'bg-brand-900 text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            @click="tipoCompetencia = 'mensal'"
          >
            Mensal
          </button>
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
            :class="tipoCompetencia === 'trimestral' ? 'bg-brand-900 text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            @click="tipoCompetencia = 'trimestral'"
          >
            Trimestral
          </button>
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
            :class="tipoCompetencia === 'anual' ? 'bg-brand-900 text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
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
        <div class="inline-flex rounded-btn border border-surface-border bg-surface-bg p-1 shadow-xs">
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
            :class="modoComparativo === 'anterior' ? 'bg-brand-900 text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            @click="modoComparativo = 'anterior'"
          >
            Mês Anterior
          </button>
          <button
            type="button"
            class="rounded px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
            :class="modoComparativo === 'yoy' ? 'bg-brand-900 text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
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

    <!-- 4 KPIs Estruturais Diretos da DRE -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="1. Receita"
        :value="kpis ? formatCurrency(kpis.receitaLiquida) : '—'"
        icon="bi-cash-coin"
        tone="brand"
        suffix="Receita líquida faturada no período"
      />
      <KpiCard
        label="2. (-) Custos"
        :value="kpis ? formatCurrency(dre?.linhas.find(l => l.codigo === '2')?.valorAtual ?? (kpis.receitaLiquida - kpis.lucroBruto)) : '—'"
        icon="bi-box-seam"
        suffix="Custos dos Produtos Vendidos (CMV)"
      />
      <KpiCard
        label="3. (-) Despesas"
        :value="kpis ? formatCurrency(kpis.despesasOperacionais) : '—'"
        icon="bi-receipt-cutoff"
        :badge="despesasDetalhadas.length ? `${despesasDetalhadas.length} contas mapeadas` : undefined"
        badge-variant="amber"
        suffix="Despesas e contas liquidadas (Plano de Contas)"
      />
      <KpiCard
        label="4. (=) Resultado Líquido"
        :value="kpis ? formatCurrency(kpis.resultadoLiquido) : '—'"
        icon="bi-trophy-fill"
        :badge="kpis ? `Margem Líquida: ${formatPercent(kpis.margemLiquida, true)}` : undefined"
        :badge-variant="kpis && kpis.resultadoLiquido >= 0 ? 'green' : 'amber'"
        suffix="Lucro ou prejuízo líquido consolidado"
      />
    </div>

    <!-- Gráfico Comparativo da Estrutura Enxuta -->
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

    <!-- Tabela Estrutural Simplificada da DRE (Receita, Custos, Despesas e Resultado Líquido) -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border/50 pb-3">
        <div>
          <h2 class="text-base font-bold text-ink">Demonstrativo do Resultado do Exercício (DRE)</h2>
          <p class="text-xs text-ink-muted">
            Estrutura direta: 1. Receita | 2. (-) Custos | 3. (-) Despesas com Plano de Contas | 4. (=) Resultado Líquido
          </p>
        </div>

        <button
          v-if="despesasDetalhadas.length > 0"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-btn border border-surface-border bg-surface-bg px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:border-brand-400 cursor-pointer"
          @click="despesasExpandidas = !despesasExpandidas"
        >
          <i :class="despesasExpandidas ? 'bi bi-chevron-up' : 'bi bi-chevron-down'" />
          <span>{{ despesasExpandidas ? 'Recolher Plano de Contas' : `Expandir Plano de Contas (${despesasDetalhadas.length} contas)` }}</span>
        </button>
      </div>

      <div v-if="carregando && !dre" class="space-y-2">
        <SkeletonCard v-for="i in 6" :key="i" variant="table-row" />
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
              <th class="py-3 pl-4 pr-3 font-semibold">Estrutura / Plano de Contas</th>
              <th class="py-3 px-4 text-right font-semibold">Período Atual (R$)</th>
              <th class="py-3 pl-3 pr-4 text-right font-semibold">% sobre a Receita (AV %)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-border/50">
            <!-- 1. RECEITA -->
            <tr class="bg-emerald-50/40 font-bold text-emerald-950 transition-colors">
              <td class="py-3.5 pl-4 pr-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">1</span>
                  <span class="text-sm font-bold">Receita</span>
                </div>
              </td>
              <td class="py-3.5 px-4 text-right font-bold text-emerald-800">
                {{ formatCurrency(dre?.kpis.receitaLiquida ?? 0) }}
              </td>
              <td class="py-3.5 pl-3 pr-4 text-right text-xs font-semibold text-emerald-800">100,00%</td>
            </tr>

            <!-- 2. (-) CUSTOS -->
            <tr class="transition-colors hover:bg-surface-bg/50 font-medium">
              <td class="py-3 pl-4 pr-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-[10px] text-white">2</span>
                  <span class="text-sm font-semibold text-ink">(-) Custos (CMV)</span>
                </div>
              </td>
              <td class="py-3 px-4 text-right text-danger-700 font-semibold">
                {{ formatCurrency(dre?.linhas.find(l => l.codigo === '2')?.valorAtual ?? 0) }}
              </td>
              <td class="py-3 pl-3 pr-4 text-right text-xs text-ink-muted">
                {{ dre?.linhas.find(l => l.codigo === '2')?.percentualVerticalAtual ? `${dre.linhas.find(l => l.codigo === '2')?.percentualVerticalAtual}%` : '—' }}
              </td>
            </tr>

            <!-- 3. (-) DESPESAS (Totalizador) -->
            <tr class="bg-amber-50/40 font-bold transition-colors">
              <td class="py-3 pl-4 pr-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] text-white">3</span>
                    <span class="text-sm font-bold text-amber-950">(-) Despesas Operacionais</span>
                  </div>
                  <span v-if="despesasDetalhadas.length" class="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {{ despesasDetalhadas.length }} contas mapeadas
                  </span>
                </div>
              </td>
              <td class="py-3 px-4 text-right text-danger-700 font-bold">
                {{ formatCurrency(-(dre?.kpis.despesasOperacionais ?? 0)) }}
              </td>
              <td class="py-3 pl-3 pr-4 text-right text-xs font-semibold text-amber-900">
                {{ dre?.kpis.receitaLiquida ? `${((dre.kpis.despesasOperacionais / dre.kpis.receitaLiquida) * 100).toFixed(2)}%` : '—' }}
              </td>
            </tr>

            <!-- 3.x PLANO DE CONTAS (Linhas detalhadas de Despesas Baixadas/Liquidadas) -->
            <template v-if="despesasExpandidas && despesasDetalhadas.length > 0">
              <tr
                v-for="d in despesasDetalhadas"
                :key="d.descricao"
                class="bg-surface transition-colors hover:bg-amber-50/20 text-xs"
              >
                <td class="py-2.5 pl-10 pr-3">
                  <div class="flex items-center gap-2">
                    <span class="rounded bg-surface-bg px-1.5 py-0.5 text-[10px] font-mono text-ink-muted border border-surface-border">
                      Plano
                    </span>
                    <span class="font-medium text-ink">{{ d.descricao }}</span>
                  </div>
                </td>
                <td class="py-2.5 px-4 text-right text-danger-600 font-semibold">
                  {{ formatCurrency(-d.valorAtual) }}
                </td>
                <td class="py-2.5 pl-3 pr-4 text-right text-xs text-ink-muted">
                  {{ dre?.kpis.receitaLiquida ? `${((d.valorAtual / dre.kpis.receitaLiquida) * 100).toFixed(2)}%` : '—' }}
                </td>
              </tr>
            </template>

            <!-- 4. (=) RESULTADO LÍQUIDO -->
            <tr class="bg-brand-50/70 border-t-2 border-brand-500 font-bold text-ink text-base">
              <td class="py-4 pl-4 pr-3">
                <div class="flex items-center gap-2">
                  <span class="flex h-6 w-6 items-center justify-center rounded-full bg-brand-700 text-xs text-white">4</span>
                  <span class="font-bold text-brand-900">(=) Resultado Líquido</span>
                </div>
              </td>
              <td
                class="py-4 px-4 text-right font-bold text-base"
                :class="(dre?.kpis.resultadoLiquido ?? 0) >= 0 ? 'text-emerald-700' : 'text-danger-700'"
              >
                {{ formatCurrency(dre?.kpis.resultadoLiquido ?? 0) }}
              </td>
              <td class="py-4 pl-3 pr-4 text-right text-xs font-bold text-brand-800">
                {{ dre?.kpis.margemLiquida ? `${dre.kpis.margemLiquida}%` : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
