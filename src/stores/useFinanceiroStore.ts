import { defineStore } from 'pinia'
import { getContasPagarPendentes, getContasReceberPendentes } from '@/services/dataService'
import { criarSubstituidor, eCancelamento } from '@/utils/cancelamento'
import type { ContaPendente } from '@/types'

const iniciarCarregamento = criarSubstituidor()

/** Escopo de período (`conta-pagar/pendentes/v1` + `conta-receber/pendentes/v1`) — usado em Relatórios. */
export const useFinanceiroStore = defineStore('financeiro', {
  state: () => ({
    aReceber: [] as ContaPendente[],
    aPagar: [] as ContaPendente[],
    carregando: false,
    carregado: false,
    erro: null as string | null,
  }),
  actions: {
    async carregarPeriodo(inicio: string, fim: string) {
      const signal = iniciarCarregamento()
      this.carregando = true
      this.erro = null
      try {
        const [receber, pagar] = await Promise.all([
          getContasReceberPendentes(inicio, fim, signal),
          getContasPagarPendentes(inicio, fim, signal),
        ])
        this.aReceber = receber
        this.aPagar = pagar
        this.carregado = true
        this.carregando = false
      } catch (e) {
        if (eCancelamento(e)) return
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar contas pendentes.'
        this.carregando = false
      }
    },
  },
})
