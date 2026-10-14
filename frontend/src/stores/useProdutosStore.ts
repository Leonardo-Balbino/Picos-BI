import { defineStore } from 'pinia'
import { getCatalogoProdutos } from '@/services/dataService'
import type { Produto } from '@/types'

/** Dimensão sob demanda (`mercadoria/v1`) — carregada só ao entrar em Produtos, cacheada por sessão. */
export const useProdutosStore = defineStore('produtos', {
  state: () => ({
    catalogo: [] as Produto[],
    carregando: false,
    carregado: false,
    erro: null as string | null,
  }),
  actions: {
    async carregar() {
      if (this.carregado || this.carregando) return
      this.carregando = true
      this.erro = null
      try {
        this.catalogo = await getCatalogoProdutos()
        this.carregado = true
      } catch (e) {
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar catálogo de produtos.'
      } finally {
        this.carregando = false
      }
    },
  },
})
