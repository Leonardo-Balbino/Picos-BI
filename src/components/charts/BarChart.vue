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
    stacked?: boolean
    valueFormatter?: (v: number) => string
  }>(),
  { height: 260, stacked: false },
)

const distributed = computed(() => props.highlightIndex !== undefined && props.series.length === 1)

const options = computed<ApexOptions>(() => {
  const overrides: ApexOptions = {
    chart: { type: 'bar', height: props.height, stacked: props.stacked },
    plotOptions: {
      bar: { columnWidth: props.stacked ? '45%' : '55%', borderRadius: props.stacked ? 2 : 4, distributed: distributed.value },
    },
    legend: { show: !distributed.value },
    xaxis: { categories: props.categories },
    yaxis: { labels: { formatter: props.valueFormatter } },
    tooltip: { y: { formatter: props.valueFormatter } },
  }
  if (distributed.value) {
    overrides.colors = props.categories.map((_, i) => (i === props.highlightIndex ? CHART_PALETTE[0] : '#D8D3E0'))
  }
  return mergeChartOptions(overrides)
})
</script>

<template>
  <VueApexCharts type="bar" :options="options" :series="series" :height="height" />
</template>
