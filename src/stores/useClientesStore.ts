import { defineStore } from 'pinia'
import { getPessoas } from '@/services/dataService'
import type { Pessoa } from '@/types'

/** Dimensão sob demanda (`pessoa/v1`) — carregada só ao entrar em Clientes, cacheada por sessão. */
export const useClientesStore = defineStore('clientes', {
  state: () => ({
    pessoas: [] as Pessoa[],
    carregando: false,
    carregado: false,
    progresso: { pagina: 0, totalPaginas: 0 },
    erro: null as string | null,
  }),
  actions: {
    async carregar() {
      if (this.carregado || this.carregando) return
      this.carregando = true
      this.erro = null
      try {
        this.pessoas = await getPessoas((pagina, totalPaginas) => {
          this.progresso = { pagina, totalPaginas }
        })
        this.carregado = true
      } catch (e) {
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar clientes.'
      } finally {
        this.carregando = false
      }
    },
  },
})
