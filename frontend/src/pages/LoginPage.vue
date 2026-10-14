<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Antigravity from '@/components/login/Antigravity.vue'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGoogleIdentity, type DadosGoogle } from '@/composables/useGoogleIdentity'

const auth = useAuthStore()
const router = useRouter()

const mensagemErro = ref<string | null>(null)
const botaoRef = ref<HTMLElement | null>(null)

function handleCredencial(dados: DadosGoogle) {
  const resultado = auth.login(dados)
  if (!resultado.ok) {
    mensagemErro.value = resultado.motivo ?? 'Acesso não autorizado.'
    return
  }
  mensagemErro.value = null
  router.push('/visao-geral')
}

const { erro: erroGoogle, renderizarBotao } = useGoogleIdentity(handleCredencial)

onMounted(() => {
  if (botaoRef.value) renderizarBotao(botaoRef.value)
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface md:flex-row">
    <div
      class="relative flex flex-col justify-between overflow-hidden bg-brand-700 px-8 py-10 sm:px-12 md:w-1/2 md:px-16 md:py-16"
    >
      <div class="absolute inset-0">
        <Antigravity
          :count="260"
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
        <p class="mt-3 max-w-sm text-lg font-medium text-brand-100">Inteligência de vendas para o seu negócio.</p>
        <p class="mt-6 flex items-center gap-2 text-sm text-brand-100/80">
          <i class="bi bi-graph-up-arrow" />
          Análises avançadas e decisões baseadas em dados reais.
        </p>
      </div>
      <div class="relative" />
    </div>

    <div class="flex flex-1 flex-col justify-between px-8 py-10 sm:px-12 md:px-16 md:py-16">
      <div />
      <div class="mx-auto w-full max-w-sm text-center">
        <h2 class="text-2xl font-bold text-ink">Bem-vindo de volta</h2>
        <p class="mt-2 text-sm text-ink-muted">Acesse sua conta para continuar</p>

        <div class="mt-8 rounded-card border border-surface-border p-6">
          <div ref="botaoRef" class="flex justify-center" />
          <p v-if="erroGoogle" class="mt-4 text-xs text-danger-700">{{ erroGoogle }}</p>
          <p v-else class="mt-4 flex items-center justify-center gap-2 text-xs text-ink-muted">
            <i class="bi bi-shield-lock" />
            Autenticação segura via Google
          </p>
        </div>

        <p v-if="mensagemErro" class="mt-4 rounded-btn bg-danger-100 px-4 py-3 text-sm text-danger-700">
          {{ mensagemErro }}
        </p>
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
