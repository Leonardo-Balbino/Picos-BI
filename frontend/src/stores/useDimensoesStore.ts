import { defineStore } from 'pinia'
import { getFormasPagamento, getEstoqueResumo } from '@/services/dataService'
import { normalizarNomeFormaPagamento } from '@/utils/formasPagamento'
import type { FormaPagamentoDim } from '@/types'

/**
 * Dimensões carregadas 1x por sessão: formas de pagamento e resumo de estoque.
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
    labelFormaPagamento: (state) => (idPagamento: string, descricao?: string) => {
      const idLimpo = String(idPagamento ?? '').replace(/^.*_/, '').trim()
      const match = state.formasPagamento.find(
        (f) =>
          f.codigo === idPagamento ||
          f.codigo === idLimpo ||
          f.codigo.endsWith(`_${idLimpo}`) ||
          f.descricao.toUpperCase() === String(descricao ?? '').toUpperCase(),
      )
      return normalizarNomeFormaPagamento(
        idPagamento,
        descricao || match?.descricao,
        match?.tipoDescricao,
      )
    },
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
