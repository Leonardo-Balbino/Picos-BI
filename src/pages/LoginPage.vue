<script setup lang="ts">
import { useRouter } from 'vue-router'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import { useAuthStore } from '@/stores/useAuthStore'

const auth = useAuthStore()
const router = useRouter()

const patternSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect x='13' y='13' width='14' height='14' fill='none' stroke='white' stroke-width='1' opacity='0.15' transform='rotate(45 20 20)'/></svg>`
const patternUrl = `url("data:image/svg+xml,${encodeURIComponent(patternSvg)}")`

function handleEntrarComGoogle() {
  auth.login()
  router.push('/visao-geral')
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface md:flex-row">
    <div
      class="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 to-brand-700 px-8 py-10 sm:px-12 md:w-1/2 md:px-16 md:py-16"
      :style="{ backgroundImage: patternUrl }"
    >
      <div />
      <div>
        <div class="mb-8 inline-flex rounded-card bg-white p-4 shadow-lg">
          <BrandLogo variant="color" :size="64" />
        </div>
        <h1 class="text-3xl font-bold text-white sm:text-4xl">PICOS Analytics</h1>
        <p class="mt-3 max-w-sm text-lg font-medium text-brand-100">
          Inteligência de vendas para o seu negócio.
        </p>
        <p class="mt-6 flex items-center gap-2 text-sm text-brand-100/80">
          <i class="bi bi-graph-up-arrow" />
          Análises avançadas e decisões baseadas em dados reais.
        </p>
      </div>
      <div />
    </div>

    <div class="flex flex-1 flex-col justify-between px-8 py-10 sm:px-12 md:px-16 md:py-16">
      <div />
      <div class="mx-auto w-full max-w-sm text-center">
        <h2 class="text-2xl font-bold text-ink">Bem-vindo de volta</h2>
        <p class="mt-2 text-sm text-ink-muted">Acesse sua conta para continuar</p>

        <div class="mt-8 rounded-card border border-surface-border p-6">
          <button
            class="flex w-full items-center justify-center gap-3 rounded-btn border border-surface-border bg-surface py-3 text-sm font-medium text-ink shadow-sm transition hover:bg-surface-bg"
            @click="handleEntrarComGoogle"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Entrar com Google
          </button>
          <p class="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
            <i class="bi bi-shield-lock" />
            Autenticação segura via SSO
          </p>
        </div>
      </div>

      <p class="mx-auto max-w-sm text-center text-xs text-ink-muted">
        Ao fazer login, você concorda com nossos
        <a href="#" class="font-semibold text-ink hover:underline">Termos de Serviço</a>
        e
        <a href="#" class="font-semibold text-ink hover:underline">Política de Privacidade</a>.
      </p>
    </div>
  </div>
</template>
