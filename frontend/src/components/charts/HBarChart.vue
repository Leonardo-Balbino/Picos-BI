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
    // Com `horizontal: true` o ApexCharts inverte a quem cada eixo delega a formatação:
    // `xaxis.labels.formatter` formata os ticks numéricos (eixo embaixo), enquanto
    // `yaxis.labels.formatter` formata os nomes das categorias (eixo à esquerda). Passar o
    // `valueFormatter` (formatador de moeda) pro `yaxis` faz o ApexCharts tentar formatar o
    // nome do PDV/produto como número e mostrar "R$ NaN" no lugar do texto.
    // `mergeChartOptions` faz merge raso de `xaxis` — como `labels` é substituído por inteiro,
    // repetimos aqui o estilo base em vez de herdar.
    xaxis: {
      categories: props.categories,
      labels: {
        formatter: props.valueFormatter,
        style: { colors: CHART_COLORS.inkMuted, fontSize: '12px' },
        hideOverlappingLabels: true,
        trim: true,
      },
    },
    // `yaxis` é substituído por inteiro (não faz merge raso, pra não quebrar o eixo duplo do
    // ComboChart) — aqui só o estilo, sem formatter numérico (os valores são os nomes das
    // categorias, não números).
    yaxis: {
      labels: { style: { colors: CHART_COLORS.inkMuted, fontSize: '12px' } },
    },
    tooltip: { y: { formatter: props.valueFormatter } },
  }),
)
</script>

<template>
  <VueApexCharts type="bar" :options="options" :series="series" :height="height" />
</template>
