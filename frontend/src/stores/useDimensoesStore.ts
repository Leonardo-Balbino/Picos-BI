import { defineStore } from 'pinia'
import { getFormasPagamento, getEstoqueResumo } from '@/services/dataService'
import type { FormaPagamentoDim } from '@/types'

/**
 * Dimensões carregadas 1x por sessão: formas de pagamento e resumo de estoque. O backend já
 * soma o saldo de todos os locais ativos num único request (`GET /estoque/resumo`) — o front
 * não precisa mais buscar local por local nem somar aqui; `estoqueDisponivel` só repassa o
 * `disponivel` que o backend calcula a partir da última sincronização de estoque.
 */
export const useDimensoesStore = defineStore('dimensoes', {
  state: () => ({
    formasPagamento: [] as FormaPagamentoDim[],
    totalItensEstoque: 0,
    estoqueDisponivel: true,
    carregando: false,
    carregado: false,
  }),
  getters: {
    labelFormaPagamento: (state) => (idPagamento: string) =>
      state.formasPagamento.find((f) => f.codigo === idPagamento)?.descricao ?? idPagamento,
  },
  actions: {
    async carregar() {
      if (this.carregado || this.carregando) return
      this.carregando = true
      try {
        const [formas, estoque] = await Promise.all([getFormasPagamento(), getEstoqueResumo()])
        this.formasPagamento = formas
        this.totalItensEstoque = estoque.totalItens
        this.estoqueDisponivel = estoque.disponivel
        this.carregado = true
      } catch {
        this.totalItensEstoque = 0
        this.estoqueDisponivel = false
      } finally {
        this.carregando = false
      }
    },
  },
})
