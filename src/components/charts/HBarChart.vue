<script setup lang="ts">
import { computed } from 'vue'
import type { ApexOptions } from 'apexcharts'
import VueApexCharts from 'vue3-apexcharts'
import { mergeChartOptions, CHART_COLORS } from './ChartTheme'

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
    // `categories` são os nomes (strings) mostrados no eixo — nunca passar `valueFormatter`
    // (formatador numérico) pro `xaxis.labels` aqui, senão o ApexCharts tenta formatar o
    // nome do produto como número e mostra "NaN" no lugar do texto. O formatador numérico
    // só entra em `yaxis`, que é o eixo de valores em barra horizontal.
    xaxis: { categories: props.categories },
    // `mergeChartOptions` substitui `yaxis` por inteiro (não faz merge raso, pra não quebrar
    // o eixo duplo do ComboChart) — por isso repete aqui o estilo base em vez de herdar.
    yaxis: {
      labels: {
        formatter: props.valueFormatter,
        style: { colors: CHART_COLORS.inkMuted, fontSize: '12px' },
      },
    },
    tooltip: { y: { formatter: props.valueFormatter } },
  }),
)
</script>

<template>
  <VueApexCharts type="bar" :options="options" :series="series" :height="height" />
</template>
