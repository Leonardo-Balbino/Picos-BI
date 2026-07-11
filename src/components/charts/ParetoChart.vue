<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions, CHART_COLORS } from './ChartTheme'
import { formatCompact, formatPercent } from '@/utils/formatters'

const props = withDefaults(
  defineProps<{
    categorias: string[]
    valores: number[]
    classes: ('A' | 'B' | 'C')[]
    acumulado: number[]
    height?: number
  }>(),
  { height: 300 },
)

const classColor: Record<'A' | 'B' | 'C', string> = {
  A: CHART_COLORS.roxo,
  B: '#8B6DB0',
  C: '#D8D3E0',
}

const series = computed(() => [
  {
    name: 'Faturamento',
    type: 'column',
    data: props.categorias.map((cat, i) => ({
      x: cat,
      y: props.valores[i],
      fillColor: classColor[props.classes[i]],
    })),
  },
  { name: '% Acumulado', type: 'line', data: props.acumulado },
])

const options = computed<ApexOptions>(() =>
  mergeChartOptions({
    chart: { type: 'line', height: props.height },
    colors: [CHART_COLORS.roxo, CHART_COLORS.ambar],
    stroke: { width: [0, 3], curve: 'smooth' },
    markers: { size: [0, 3] },
    plotOptions: { bar: { columnWidth: '65%', borderRadius: 3 } },
    legend: { show: false },
    xaxis: {
      categories: props.categorias,
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: [
      { title: { text: 'Faturamento' }, labels: { formatter: (v: number) => formatCompact(v) } },
      {
        opposite: true,
        min: 0,
        max: 100,
        title: { text: '% Acumulado' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}%` },
      },
    ],
    tooltip: {
      shared: true,
      y: {
        formatter: (v: number, opts?: { seriesIndex: number }) =>
          opts?.seriesIndex === 1 ? formatPercent(v, true) : formatCompact(v),
      },
    },
  }),
)
</script>

<template>
  <VueApexCharts type="line" :options="options" :series="series" :height="height" />
</template>
