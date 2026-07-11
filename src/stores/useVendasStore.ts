import { defineStore } from 'pinia'
import type { Venda, Produto, Categoria, Vendedor, Cliente } from '@/types'
import { getVendas, getProdutos, getCategorias, getVendedores, getClientes } from '@/services/dataService'

export const useVendasStore = defineStore('vendas', {
  state: () => ({
    vendas: [] as Venda[],
    produtos: [] as Produto[],
    categorias: [] as Categoria[],
    vendedores: [] as Vendedor[],
    clientes: [] as Cliente[],
    carregando: false,
    carregado: false,
  }),
  getters: {
    lojas: (state) => Array.from(new Set(state.vendedores.map((v) => v.loja))),
    produtoPorId: (state) => (id: string) => state.produtos.find((p) => p.id === id),
    vendedorPorId: (state) => (id: string) => state.vendedores.find((v) => v.id === id),
    clientePorId: (state) => (id: string) => state.clientes.find((c) => c.id === id),
    categoriaPorId: (state) => (id: string) => state.categorias.find((c) => c.id === id),
  },
  actions: {
    async carregar() {
      if (this.carregado || this.carregando) return
      this.carregando = true
      const [vendas, produtos, categorias, vendedores, clientes] = await Promise.all([
        getVendas(),
        getProdutos(),
        getCategorias(),
        getVendedores(),
        getClientes(),
      ])
      this.vendas = vendas
      this.produtos = produtos
      this.categorias = categorias
      this.vendedores = vendedores
      this.clientes = clientes
      this.carregado = true
      this.carregando = false
    },
  },
})
