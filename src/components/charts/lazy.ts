/**
 * Versões lazy-loaded dos wrappers de gráfico. `vue3-apexcharts`/`apexcharts` é, de longe, o
 * maior pedaço do bundle (>500kB minificado — ver aviso do `npm run build`); importar os
 * wrappers estaticamente força esse peso inteiro a bloquear o primeiro paint de QUALQUER
 * página que tenha gráfico, mesmo antes de KPIs (que não dependem do ApexCharts) aparecerem.
 * `defineAsyncComponent` faz o Vite separar esse peso num chunk que carrega em paralelo, sem
 * travar o resto da página — o `ChartLoading` (skeleton) cobre o intervalo até chegar.
 */
import { defineAsyncComponent } from 'vue'
import ChartLoading from './ChartLoading.vue'

export const LineAreaChart = defineAsyncComponent({
  loader: () => import('./LineAreaChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})

export const BarChart = defineAsyncComponent({
  loader: () => import('./BarChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})

export const HBarChart = defineAsyncComponent({
  loader: () => import('./HBarChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})

export const DonutChart = defineAsyncComponent({
  loader: () => import('./DonutChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})

export const ComboChart = defineAsyncComponent({
  loader: () => import('./ComboChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})

export const ParetoChart = defineAsyncComponent({
  loader: () => import('./ParetoChart.vue'),
  loadingComponent: ChartLoading,
  delay: 0,
})
