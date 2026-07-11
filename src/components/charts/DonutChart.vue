<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions } from './ChartTheme'

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: number[]
    height?: number
    totalLabel?: string
    valueFormatter?: (v: number) => string
  }>(),
  { height: 240, totalLabel: 'TOTAL' },
)

const options = computed<ApexOptions>(() =>
  mergeChartOptions({
    chart: { type: 'donut', height: props.height },
    labels: props.labels,
    stroke: { width: 2, colors: ['#FFFFFF'] },
    legend: { position: 'right' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: { fontSize: '13px', color: '#6B6478' },
            value: {
              fontSize: '20px',
              fontWeight: 700,
              color: '#2E1F42',
              formatter: (v: string) => (props.valueFormatter ? props.valueFormatter(Number(v)) : v),
            },
            total: {
              show: true,
              label: props.totalLabel,
              fontSize: '12px',
              color: '#6B6478',
              formatter: (w: { globals: { seriesTotals: number[] } }) => {
                const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                return props.valueFormatter ? props.valueFormatter(total) : String(total)
              },
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: props.valueFormatter } },
  }),
)
</script>

<template>
  <VueApexCharts type="donut" :options="options" :series="series" :height="height" />
</template>
