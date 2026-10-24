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
    dataLabels: {
      enabled: true, enabledOnSeries: [0], offsetY: -18,
      style: { colors: ['#000000'], fontSize: '11px', fontWeight: 600 },
      background: { enabled: false }, dropShadow: { enabled: false },
      formatter: (v: number) => formatCompact(v),
    },
    grid: { padding: { top: 25 } },
    markers: { size: [0, 3] },
    plotOptions: { bar: { columnWidth: '65%', borderRadius: 3, dataLabels: { position: 'top' } } },
    legend: { show: false },
    xaxis: {
      categories: props.categorias,
      labels: { rotate: -45, style: { fontSize: '10px' } },
    },
    yaxis: [
      { min: 0, max: (v: number) => v > 0 ? v * 1.2 : 1, title: { text: 'Faturamento' }, labels: { formatter: (v: number) => formatCompact(v) } },
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
  <div class="overflow-x-auto"><div :style="{ minWidth: categorias.length > 5 ? categorias.length * 76 + 'px' : undefined }">
    <VueApexCharts type="line" :options="options" :series="series" :height="height" />
  </div></div>
</template>
