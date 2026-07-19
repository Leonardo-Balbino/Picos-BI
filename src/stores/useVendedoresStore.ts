import { defineStore } from 'pinia'
import { getComissoes } from '@/services/dataService'
import { criarSubstituidor, eCancelamento } from '@/utils/cancelamento'
import type { Comissao } from '@/types'

const iniciarCarregamento = criarSubstituidor()

/** Escopo de período (`funcionario/comissoes/v1`) — decisão de integrar em vez de "Em breve". */
export const useVendedoresStore = defineStore('vendedores', {
  state: () => ({
    comissoes: [] as Comissao[],
    carregando: false,
    carregado: false,
    erro: null as string | null,
  }),
  actions: {
    async carregarPeriodo(dataInicio: string, dataFim: string) {
      const signal = iniciarCarregamento()
      this.carregando = true
      this.erro = null
      try {
        this.comissoes = await getComissoes(dataInicio, dataFim, signal)
        this.carregado = true
        this.carregando = false
      } catch (e) {
        if (eCancelamento(e)) return
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar comissões.'
        this.carregando = false
      }
    },
  },
})
