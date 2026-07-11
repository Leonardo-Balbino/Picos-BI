import type { FormaPagamento, StatusVenda } from '@/types'

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
}

const STATUS_VENDA_LABEL: Record<StatusVenda, string> = {
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  estornada: 'Estornada',
}

const STATUS_VENDA_VARIANT: Record<StatusVenda, 'success' | 'danger' | 'neutral'> = {
  concluida: 'success',
  cancelada: 'danger',
  estornada: 'neutral',
}

export function statusVendaLabel(status: StatusVenda): string {
  return STATUS_VENDA_LABEL[status]
}

export function statusVendaVariant(status: StatusVenda): 'success' | 'danger' | 'neutral' {
  return STATUS_VENDA_VARIANT[status]
}

export function iniciais(nome: string): string {
  return nome
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const CORES_AVATAR = ['#452C63', '#3FBF8F', '#F0A93B', '#3B82A9', '#8B6DB0', '#1E8E5A']

export function corAvatar(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return CORES_AVATAR[hash % CORES_AVATAR.length]
}
