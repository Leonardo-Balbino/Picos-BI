import { defineStore } from 'pinia'
import { getUsuarioConfig, type UsuarioConfig } from '@/services/dataService'

export const useConfiguracoesStore = defineStore('configuracoes', {
  state: () => ({
    dados: null as UsuarioConfig | null,
    carregado: false,
  }),
  actions: {
    async carregar() {
      if (this.carregado) return
      this.dados = await getUsuarioConfig()
      this.carregado = true
    },
    salvar(parcial: Partial<UsuarioConfig>) {
      if (!this.dados) return
      this.dados = { ...this.dados, ...parcial }
    },
  },
})
