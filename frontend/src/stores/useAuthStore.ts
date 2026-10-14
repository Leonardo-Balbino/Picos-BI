import { defineStore } from 'pinia'
import { limparCacheApi } from '@/services/api'

export interface Usuario {
  nome: string
  email: string
  foto: string
}

export interface LoginResultado {
  ok: boolean
  motivo?: string
}

const CHAVE_SESSAO = 'picos_auth'

function lerSessao(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(CHAVE_SESSAO)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

function emailAutorizado(email: string): boolean {
  const lista = (import.meta.env.VITE_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return lista.includes(email.toLowerCase())
}

export const useAuthStore = defineStore('auth', {
  // Hidrata de sessionStorage de forma síncrona — sem corrida com o guard do router,
  // que roda logo após `app.mount()`.
  state: () => ({
    usuario: lerSessao() as Usuario | null,
  }),
  getters: {
    autenticado: (state) => state.usuario !== null,
  },
  actions: {
    login(dados: Usuario): LoginResultado {
      if (!emailAutorizado(dados.email)) {
        return {
          ok: false,
          motivo: 'Esta conta não tem acesso ao PICOS Analytics. Fale com a PICOS Sistemas para liberar seu acesso.',
        }
      }
      this.usuario = dados
      sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados))
      return { ok: true }
    },
    logout() {
      this.usuario = null
      sessionStorage.removeItem(CHAVE_SESSAO)
      limparCacheApi()
    },
  },
})
