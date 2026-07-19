import { defineStore } from 'pinia'
import type { FiltrosState } from '@/types'

export const useFiltersStore = defineStore('filters', {
  state: (): FiltrosState => ({
    periodo: 'semana',
    range: { inicio: '', fim: '' },
    idCaixa: 'todos',
  }),
  actions: {
    setRangePersonalizado(inicio: string, fim: string) {
      this.periodo = 'personalizado'
      this.range = { inicio, fim }
    },
  },
})
