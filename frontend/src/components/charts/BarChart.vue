<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions, CHART_PALETTE } from './ChartTheme'

const props = withDefaults(
  defineProps<{
    categories: string[]
    series: { name: string; data: number[] }[]
    height?: number
    highlightIndex?: number
    highlightColor?: string
    baseColor?: string
    showDataLabels?: boolean
    stacked?: boolean
    valueFormatter?: (v: number) => string
  }>(),
  { height: 260, stacked: false, showDataLabels: true },
)

const distributed = computed(() => props.highlightIndex !== undefined && props.series.length === 1)

const options = computed<ApexOptions>(() => {
  const overrides: ApexOptions = {
    chart: { type: 'bar', height: props.height, stacked: props.stacked },
    plotOptions: {
      bar: { columnWidth: props.stacked ? '45%' : '55%', borderRadius: props.stacked ? 2 : 4, distributed: distributed.value, dataLabels: { position: 'top' } },
    },
    dataLabels: {
      enabled: props.showDataLabels,
      formatter: (val: string | number | number[]) => {
        const num = typeof val === 'number' ? val : Number(val)
        if (num === 0) return ''
        return props.valueFormatter ? props.valueFormatter(num) : String(num)
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        fontFamily: 'Montserrat, sans-serif',
        colors: ['#000000'],
      },
      offsetY: -18,
      background: { enabled: false },
      dropShadow: { enabled: false },
    },
    grid: { padding: { top: 25, right: 18, left: 8 } },
    legend: { show: !distributed.value },
    xaxis: { categories: props.categories },
    yaxis: { min: Math.min(0, ...props.series.flatMap((serie) => serie.data)), max: (max: number) => Math.max(1, max * 1.2), labels: { formatter: props.valueFormatter } },
    tooltip: { y: { formatter: props.valueFormatter } },
  }
  if (distributed.value) {
    const activeColor = props.highlightColor ?? CHART_PALETTE[0]
    const neutralColor = props.baseColor ?? '#D8D3E0'
    overrides.colors = props.categories.map((_, i) => (i === props.highlightIndex ? activeColor : neutralColor))
  }
  return mergeChartOptions(overrides)
})
</script>

<template>
  <div class="overflow-x-auto"><div :style="{ minWidth: categories.length > 5 ? categories.length * 76 + 'px' : '0' }"><VueApexCharts type="bar" :options="options" :series="series" :height="height" /></div></div>
</template>
