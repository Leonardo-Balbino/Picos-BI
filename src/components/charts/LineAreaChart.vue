<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions } from './ChartTheme'

const props = withDefaults(
  defineProps<{
    categories: string[]
    series: { name: string; data: number[] }[]
    metaValue?: number
    metaLabel?: string
    height?: number
    valueFormatter?: (v: number) => string
  }>(),
  { height: 280, metaLabel: 'Meta' },
)

const options = computed<ApexOptions>(() => {
  const overrides: ApexOptions = {
    chart: { type: 'area', height: props.height },
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'solid', opacity: 0.15 },
    markers: { size: 0 },
    xaxis: { categories: props.categories },
    yaxis: { labels: { formatter: props.valueFormatter } },
    tooltip: { y: { formatter: props.valueFormatter } },
  }
  if (props.metaValue !== undefined) {
    overrides.annotations = {
      yaxis: [
        {
          y: props.metaValue,
          borderColor: '#8B6DB0',
          strokeDashArray: 4,
          label: {
            text: props.metaLabel,
            style: { color: '#FFFFFF', background: '#8B6DB0' },
          },
        },
      ],
    }
  }
  return mergeChartOptions(overrides)
})
</script>

<template>
  <VueApexCharts type="area" :options="options" :series="series" :height="height" />
</template>
