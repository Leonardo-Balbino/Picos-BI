import { defineStore } from 'pinia'
import { getVendedoresVendas, type VendedorVendas, type ResumoVendedores } from '@/services/dataService'
import { criarSubstituidor, eCancelamento } from '@/utils/cancelamento'

const iniciarCarregamento = criarSubstituidor()

export const useVendedoresStore = defineStore('vendedores', {
  state: () => ({
    vendedores: [] as VendedorVendas[],
    resumo: null as ResumoVendedores | null,
    carregando: false,
    carregado: false,
    erro: null as string | null,
  }),
  actions: {
    async carregarPeriodo(dataInicio: string, dataFim: string, idsLojas = '', idCaixa = 'todos') {
      const signal = iniciarCarregamento()
      this.carregando = true
      this.erro = null
      try {
        const resposta = await getVendedoresVendas(dataInicio, dataFim, idsLojas, idCaixa, signal)
        if (signal.aborted) return
        this.resumo = resposta
        this.vendedores = (resposta.items ?? []).map((v) => ({
          ...v,
          ticketMedio: v.ticketMedio || (v.quantidadeVendas > 0 ? v.totalVendido / v.quantidadeVendas : 0),
        }))
        this.carregado = true
        this.carregando = false
      } catch (e) {
        if (signal.aborted || eCancelamento(e)) return
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar dados de vendedores.'
        this.carregando = false
      }
    },
  },
})
