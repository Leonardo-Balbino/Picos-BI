import { defineStore } from 'pinia'
import { getFormasPagamento, getLocaisEstoque, getSaldoEstoqueLocal } from '@/services/dataService'
import type { FormaPagamentoDim, LocalEstoque } from '@/types'

/**
 * Dimensões carregadas 1x por sessão: formas de pagamento (`pagamento/v1`) e estoque
 * (`local-estoque/v1` + soma de `qtdSaldo` via `local-estoque/{id}/estoques/v1` — confirmada
 * por inspeção real em 2026-07-18). Se o schema de estoque divergir do esperado (ou a rota
 * mudar), `estoqueDisponivel` cai para `false` e a tela mostra "indisponível" em vez de quebrar.
 */
export const useDimensoesStore = defineStore('dimensoes', {
  state: () => ({
    formasPagamento: [] as FormaPagamentoDim[],
    locaisEstoque: [] as LocalEstoque[],
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
        const [formas, locais] = await Promise.all([getFormasPagamento(), getLocaisEstoque()])
        this.formasPagamento = formas
        this.locaisEstoque = locais
        await this.carregarEstoque()
        this.carregado = true
      } finally {
        this.carregando = false
      }
    },
    async carregarEstoque() {
      try {
        const locaisAtivos = this.locaisEstoque.filter((l) => l.ativo)
        const saldos = await Promise.all(locaisAtivos.map((l) => getSaldoEstoqueLocal(l.codigo)))
        // qtdSaldo pode ser negativo (venda sem controle de estoque rigoroso) — negativo por
        // item não reduz o total de itens fisicamente em estoque, então soma só o positivo.
        this.totalItensEstoque = saldos.flat().reduce((acc, s) => acc + Math.max(0, s.qtdSaldo), 0)
        this.estoqueDisponivel = true
      } catch {
        this.totalItensEstoque = 0
        this.estoqueDisponivel = false
      }
    },
  },
})
