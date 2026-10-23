<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const Antigravity = defineAsyncComponent(() => import('@/components/login/Antigravity.vue'))

const auth = useAuthStore()
const router = useRouter()

const isDesktop = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)

function handleResize() {
  isDesktop.value = window.innerWidth >= 768
}

onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const email = ref('picossistemas.adm@gmail.com')
const senha = ref('Picos@admin2026')
const exibirSenha = ref(false)
const lembrar = ref(true)
const carregando = ref(false)
const mensagemErro = ref<string | null>(null)

async function handleLogin() {
  if (!email.value || !senha.value) {
    mensagemErro.value = 'Por favor, preencha o e-mail e a senha.'
    return
  }

  carregando.value = true
  mensagemErro.value = null

  try {
    const resultado = await auth.login(email.value, senha.value, lembrar.value)
    if (!resultado.ok) {
      mensagemErro.value = resultado.motivo ?? 'E-mail ou senha inválidos.'
      return
    }
    router.push('/visao-geral')
  } catch (err) {
    mensagemErro.value = err instanceof Error ? err.message : 'Falha na autenticação.'
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface md:flex-row">
    <!-- Banner lateral com animação Particle / Antigravity -->
    <div
      class="relative flex flex-col justify-between overflow-hidden bg-brand-700 px-8 py-10 sm:px-12 md:w-1/2 md:px-16 md:py-16"
    >
      <div v-if="isDesktop" class="absolute inset-0">
        <Antigravity
          :count="220"
          :magnet-radius="6"
          :ring-radius="7"
          :wave-speed="0.4"
          :wave-amplitude="1"
          :particle-size="0.7"
          :lerp-speed="0.05"
          color="#62D26F"
          :auto-animate="true"
          :particle-variance="1"
        />
      </div>
      <div class="relative" />
      <div class="relative">
        <div class="mb-8 inline-flex rounded-card bg-white p-4 shadow-lg">
          <BrandLogo variant="color" :size="64" />
        </div>
        <h1 class="text-3xl font-bold text-white sm:text-4xl">PICOS Analytics</h1>
        <p class="mt-3 max-w-sm text-lg font-medium text-brand-100">Inteligência de vendas para redes de franquias.</p>
        <p class="mt-6 flex items-center gap-2 text-sm text-brand-100/80">
          <i class="bi bi-shield-check text-green-400" />
          Autenticação segura via tokens JWT de alta confiabilidade.
        </p>
      </div>
      <div class="relative" />
    </div>

    <!-- Formulário de Login Seguro (JWT) -->
    <div class="flex flex-1 flex-col justify-between px-8 py-10 sm:px-12 md:px-16 md:py-16">
      <div />
      <div class="mx-auto w-full max-w-sm">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-ink">Bem-vindo de volta</h2>
          <p class="mt-1 text-sm text-ink-muted">Acesse seu painel executivo de BI</p>
        </div>

        <form class="mt-8 space-y-4" @submit.prevent="handleLogin">
          <!-- Campo E-mail -->
          <div>
            <label for="email" class="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
              E-mail
            </label>
            <div class="relative mt-1.5">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
                <i class="bi bi-envelope text-sm" />
              </span>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="seu.email@exemplo.com"
                class="w-full rounded-btn border border-surface-border bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink-muted/50 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <!-- Campo Senha -->
          <div>
            <div class="flex items-center justify-between">
              <label for="senha" class="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Senha
              </label>
            </div>
            <div class="relative mt-1.5">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
                <i class="bi bi-key text-sm" />
              </span>
              <input
                id="senha"
                v-model="senha"
                :type="exibirSenha ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="Sua senha de acesso"
                class="w-full rounded-btn border border-surface-border bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder-ink-muted/50 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-muted hover:text-ink"
                tabindex="-1"
                @click="exibirSenha = !exibirSenha"
              >
                <i class="bi" :class="exibirSenha ? 'bi-eye-slash' : 'bi-eye'" />
              </button>
            </div>
          </div>

          <!-- Opções Adicionais -->
          <div class="flex items-center justify-between text-xs">
            <label class="flex items-center gap-2 cursor-pointer text-ink-muted hover:text-ink">
              <input
                v-model="lembrar"
                type="checkbox"
                class="rounded border-surface-border text-brand-600 focus:ring-brand-500"
              />
              <span>Manter conectado</span>
            </label>
          </div>

          <!-- Mensagem de Erro -->
          <div
            v-if="mensagemErro"
            class="flex items-center gap-2 rounded-btn bg-danger-100 p-3 text-xs font-semibold text-danger-700"
          >
            <i class="bi bi-exclamation-circle-fill shrink-0 text-sm" />
            <span>{{ mensagemErro }}</span>
          </div>

          <!-- Botão Entrar -->
          <BaseButton
            type="submit"
            variant="primary"
            class="w-full justify-center py-2.5 text-sm font-semibold shadow-md"
            :disabled="carregando"
          >
            <span v-if="carregando" class="flex items-center gap-2">
              <svg class="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Entrando...
            </span>
            <span v-else class="flex items-center gap-2">
              <i class="bi bi-box-arrow-in-right" />
              Entrar no Sistema
            </span>
          </BaseButton>
        </form>

        <div class="mt-6 rounded-btn border border-surface-border/80 bg-surface-bg p-3 text-center text-xs text-ink-muted">
          <i class="bi bi-info-circle mr-1 text-brand-600" />
          Acesso protegido por autenticação segura JWT.
        </div>
      </div>

      <p class="mx-auto max-w-sm text-center text-xs text-ink-muted">
        Ao fazer login, você concorda com os termos da rede PICOS Analytics.
      </p>
    </div>
  </div>
</template>
