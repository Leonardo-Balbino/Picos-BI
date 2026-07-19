<script setup lang="ts">
import PageHeader from '@/components/layout/PageHeader.vue'
import { useUiStore } from '@/stores/useUiStore'

const ui = useUiStore()

const apps = [
  { id: 'leitor-codigo', nome: 'Leitor de Código de Barras', descricao: 'Escaneie produtos direto pela câmera do celular.', icone: 'bi-upc-scan' },
  { id: 'etiquetas', nome: 'Etiquetas de Preço', descricao: 'Gere e imprima etiquetas para o balcão.', icone: 'bi-tags' },
  { id: 'consulta-estoque', nome: 'Consulta de Estoque Rápida', descricao: 'Veja o saldo de um produto sem abrir o sistema completo.', icone: 'bi-box-seam' },
  { id: 'calculadora-margem', nome: 'Calculadora de Margem', descricao: 'Simule preço de venda a partir do custo e da margem desejada.', icone: 'bi-calculator' },
]

function abrir() {
  ui.toast({ title: 'Este app estará disponível em breve.', variant: 'info' })
}
</script>

<template>
  <div>
    <PageHeader title="Apps" subtitle="Ferramentas extras para o dia a dia do seu negócio." />

    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="app in apps"
        :key="app.id"
        type="button"
        class="rounded-card bg-surface p-5 text-left shadow-sm transition hover:shadow-lg"
        @click="abrir"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <i class="bi text-lg" :class="app.icone" />
        </span>
        <p class="mt-4 text-sm font-semibold text-ink">{{ app.nome }}</p>
        <p class="mt-1 text-xs text-ink-muted">{{ app.descricao }}</p>
        <span class="mt-3 inline-flex rounded-full bg-surface-bg px-2 py-0.5 text-xs font-semibold text-ink-muted">Em breve</span>
      </button>
    </div>
  </div>
</template>
