<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions } from './ChartTheme'

const props = withDefaults(
  defineProps<{
    categories: string[]
    series: { name: string; data: number[] }[]
    height?: number
    valueFormatter?: (v: number) => string
  }>(),
  { height: 240 },
)

const options = computed<ApexOptions>(() =>
  mergeChartOptions({
    chart: { type: 'bar', height: props.height },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '55%' } },
    dataLabels: {
      enabled: true,
      formatter: props.valueFormatter,
      style: { colors: ['#2E1F42'], fontFamily: 'Montserrat, sans-serif', fontWeight: 600 },
    },
    legend: { show: false },
    xaxis: { categories: props.categories, labels: { formatter: props.valueFormatter } },
    tooltip: { y: { formatter: props.valueFormatter } },
  }),
)
</script>

<template>
  <VueApexCharts type="bar" :options="options" :series="series" :height="height" />
</template>
