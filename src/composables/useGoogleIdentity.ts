import { ref } from 'vue'

export interface DadosGoogle {
  nome: string
  email: string
  foto: string
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<void> | null = null

function carregarScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Não foi possível carregar o script do Google Identity Services.'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Decodifica só o payload do JWT (sem verificar assinatura — front-end-only nesta fase, sem backend). */
function decodificarCredencial(credential: string): DadosGoogle {
  const payloadBase64 = credential.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? ''
  const payload = JSON.parse(atob(payloadBase64)) as { name?: string; email?: string; picture?: string }
  return { nome: payload.name ?? '', email: payload.email ?? '', foto: payload.picture ?? '' }
}

export function useGoogleIdentity(onCredencial: (dados: DadosGoogle) => void) {
  const carregando = ref(false)
  const erro = ref<string | null>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  async function renderizarBotao(elemento: HTMLElement): Promise<void> {
    if (!clientId) {
      erro.value = 'Login com Google não configurado (VITE_GOOGLE_CLIENT_ID ausente no .env).'
      return
    }
    carregando.value = true
    try {
      await carregarScript()
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredencial(decodificarCredencial(response.credential)),
      })
      window.google!.accounts.id.renderButton(elemento, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        locale: 'pt-BR',
      })
    } catch (e) {
      erro.value = e instanceof Error ? e.message : 'Erro ao carregar o Google Identity Services.'
    } finally {
      carregando.value = false
    }
  }

  return { carregando, erro, renderizarBotao }
}
