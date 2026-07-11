import { defineStore } from 'pinia'

export interface Usuario {
  nome: string
  email: string
  contaGoogleVinculada: boolean
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: null as Usuario | null,
  }),
  getters: {
    autenticado: (state) => state.usuario !== null,
  },
  actions: {
    login() {
      this.usuario = {
        nome: 'João Silva',
        email: 'joao.silva@exemplo.com.br',
        contaGoogleVinculada: true,
      }
    },
    logout() {
      this.usuario = null
    },
    desvincular() {
      if (this.usuario) this.usuario.contaGoogleVinculada = false
    },
  },
})
