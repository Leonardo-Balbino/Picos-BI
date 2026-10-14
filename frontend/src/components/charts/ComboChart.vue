<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions, CHART_PALETTE } from './ChartTheme'

const props = withDefaults(
  defineProps<{
    categories: string[]
    barName: string
    barData: number[]
    lineName: string
    lineData: number[]
    height?: number
    barFormatter?: (v: number) => string
    lineFormatter?: (v: number) => string
  }>(),
  { height: 300 },
)

const series = computed(() => [
  { name: props.barName, type: 'bar', data: props.barData },
  { name: props.lineName, type: 'line', data: props.lineData },
])

const options = computed<ApexOptions>(() =>
  mergeChartOptions({
    chart: { type: 'line', height: props.height },
    colors: [CHART_PALETTE[0], CHART_PALETTE[1]],
    stroke: { width: [0, 3], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '45%', borderRadius: 4 } },
    markers: { size: [0, 4] },
    xaxis: { categories: props.categories },
    yaxis: [
      { title: { text: props.barName }, labels: { formatter: props.barFormatter } },
      { opposite: true, title: { text: props.lineName }, labels: { formatter: props.lineFormatter } },
    ],
    tooltip: {
      shared: true,
      y: {
        formatter: (v: number, opts?: { seriesIndex: number }) =>
          opts?.seriesIndex === 1
            ? (props.lineFormatter ? props.lineFormatter(v) : String(v))
            : (props.barFormatter ? props.barFormatter(v) : String(v)),
      },
    },
  }),
)
</script>

<template>
  <VueApexCharts type="line" :options="options" :series="series" :height="height" />
</template>
