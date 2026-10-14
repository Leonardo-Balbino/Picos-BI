const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const integerFormatter = new Intl.NumberFormat('pt-BR')

export function formatCurrency(v: number): string {
  return currencyFormatter.format(v)
}

/** Notação compacta para eixos e espaços reduzidos (ex.: "R$ 12,5 mil"). */
export function formatCompact(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  }
  return currencyFormatter.format(v)
}

export function formatNumber(v: number): string {
  return integerFormatter.format(v)
}

/** Recebe fração (0-1) ou valor já em porcentagem (0-100) conforme `alreadyPercent`. */
export function formatPercent(v: number, alreadyPercent = false): string {
  return percentFormatter.format(alreadyPercent ? v / 100 : v)
}

export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${formatDate(date)} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatShortDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
