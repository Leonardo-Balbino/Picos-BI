import type { ApexOptions } from 'apexcharts'

/** Paleta categórica única para todos os gráficos (ordem fixa, cores chapadas). */
export const CHART_PALETTE = [
  '#452C63', // roxo
  '#3FBF8F', // verde
  '#F0A93B', // âmbar
  '#3B82A9', // azul-petróleo
  '#8B6DB0', // lilás
  '#8FD9A8', // verde claro
] as const

export const CHART_COLORS = {
  roxo: '#452C63',
  verde: '#3FBF8F',
  ambar: '#F0A93B',
  azulPetroleo: '#3B82A9',
  lilas: '#8B6DB0',
  verdeClaro: '#8FD9A8',
  danger: '#E05260',
  ink: '#2E1F42',
  inkMuted: '#6B6478',
  border: '#E2DFE8',
}

/** Opções base do ApexCharts reutilizadas por todos os wrappers de gráfico. */
export const baseChartOptions: ApexOptions = {
  chart: {
    fontFamily: 'Montserrat, sans-serif',
    toolbar: { show: false },
    zoom: { enabled: false },
    foreColor: CHART_COLORS.inkMuted,
    animations: { enabled: true, speed: 300 },
  },
  colors: [...CHART_PALETTE],
  fill: { type: 'solid' },
  dataLabels: { enabled: false },
  noData: {
    text: 'Sem dados para o período selecionado',
    style: { color: CHART_COLORS.inkMuted, fontFamily: 'Montserrat, sans-serif', fontSize: '13px' },
  },
  stroke: { width: 2, curve: 'smooth' },
  grid: {
    borderColor: CHART_COLORS.border,
    strokeDashArray: 4,
    padding: { left: 8, right: 8 },
  },
  legend: {
    fontFamily: 'Montserrat, sans-serif',
    labels: { colors: CHART_COLORS.ink },
    markers: { size: 6 },
  },
  tooltip: {
    theme: 'light',
    style: { fontFamily: 'Montserrat, sans-serif' },
  },
  xaxis: {
    labels: { style: { colors: CHART_COLORS.inkMuted, fontSize: '12px' } },
    axisBorder: { color: CHART_COLORS.border },
    axisTicks: { color: CHART_COLORS.border },
  },
  yaxis: {
    labels: { style: { colors: CHART_COLORS.inkMuted, fontSize: '12px' } },
  },
}

/** Merge raso de opções específicas de um gráfico sobre a base comum. */
export function mergeChartOptions(overrides: ApexOptions): ApexOptions {
  return {
    ...baseChartOptions,
    ...overrides,
    chart: { ...baseChartOptions.chart, ...overrides.chart },
    fill: { ...baseChartOptions.fill, ...overrides.fill },
    grid: { ...baseChartOptions.grid, ...overrides.grid },
    legend: { ...baseChartOptions.legend, ...overrides.legend },
    tooltip: { ...baseChartOptions.tooltip, ...overrides.tooltip },
    xaxis: { ...baseChartOptions.xaxis, ...overrides.xaxis },
    yaxis: overrides.yaxis ?? baseChartOptions.yaxis,
  }
}
