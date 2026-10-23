import { defineStore } from 'pinia'
import { apiPost, limparCacheApi } from '@/services/api'

export type PerfilUsuario = 'ADMIN' | 'FRANQUEADO'

export interface Usuario {
  id?: string
  nome: string
  email: string
  foto?: string
  perfil?: PerfilUsuario
  lojasPermitidas?: string[]
}

export interface LoginResultado {
  ok: boolean
  motivo?: string
}

interface RespostaLoginApi {
  accessToken: string
  usuario: {
    id: string
    email: string
    nome: string
    perfil: PerfilUsuario
    lojasAutorizadas?: string[]
  }
}

const CHAVE_SESSAO = 'picos_auth'
const CHAVE_TOKEN = 'picos_token'

function lerSessao(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(CHAVE_SESSAO) || localStorage.getItem(CHAVE_SESSAO)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch {
    return null
  }
}

function lerToken(): string | null {
  return sessionStorage.getItem(CHAVE_TOKEN) || localStorage.getItem(CHAVE_TOKEN)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    usuario: lerSessao() as Usuario | null,
    token: lerToken() as string | null,
  }),
  getters: {
    autenticado: (state) => Boolean(state.usuario && state.token),
    isMatrizAdmin: (state) => (state.usuario?.perfil ?? 'ADMIN') === 'ADMIN',
    lojasAutorizadas: (state) => state.usuario?.lojasPermitidas ?? [],
  },
  actions: {
    async login(email: string, senha: string, manterConectado = true): Promise<LoginResultado> {
      try {
        const resposta = await apiPost<RespostaLoginApi>('/auth/login', {
          email: email.trim().toLowerCase(),
          senha,
        })

        const { accessToken, usuario } = resposta
        this.token = accessToken
        this.usuario = {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          lojasPermitidas: usuario.lojasAutorizadas ?? [],
        }

        const storage = manterConectado ? localStorage : sessionStorage
        storage.setItem(CHAVE_TOKEN, accessToken)
        storage.setItem(CHAVE_SESSAO, JSON.stringify(this.usuario))

        return { ok: true }
      } catch (e) {
        const motivo = e instanceof Error ? e.message : 'E-mail ou senha incorretos.'
        return { ok: false, motivo }
      }
    },
    logout() {
      this.usuario = null
      this.token = null
      sessionStorage.removeItem(CHAVE_TOKEN)
      sessionStorage.removeItem(CHAVE_SESSAO)
      localStorage.removeItem(CHAVE_TOKEN)
      localStorage.removeItem(CHAVE_SESSAO)
      limparCacheApi()
    },
  },
})
