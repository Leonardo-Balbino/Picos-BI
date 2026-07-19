import { defineStore } from 'pinia'
import { getEmpresa } from '@/services/dataService'
import type { Empresa } from '@/types'

/** Dimensão carregada 1x por sessão (`empresa/v1`) — nome exibido na topbar. */
export const useEmpresaStore = defineStore('empresa', {
  state: () => ({
    dados: null as Empresa | null,
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
        this.dados = await getEmpresa()
        this.carregado = true
      } catch (e) {
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar dados da empresa.'
      } finally {
        this.carregando = false
      }
    },
  },
})
