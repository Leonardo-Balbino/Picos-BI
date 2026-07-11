import { defineStore } from 'pinia'
import type { FiltrosState } from '@/types'

export const useFiltersStore = defineStore('filters', {
  state: (): FiltrosState => ({
    periodo: '30d',
    range: { inicio: '', fim: '' },
    lojaId: 'todas',
    categoriaId: 'todas',
    formaPagamento: 'todas',
    vendedorId: 'todos',
  }),
  actions: {
    setRangePersonalizado(inicio: string, fim: string) {
      this.periodo = 'personalizado'
      this.range = { inicio, fim }
    },
  },
})
