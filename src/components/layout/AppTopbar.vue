<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

const auth = useAuthStore()
const ui = useUiStore()

const initials = computed(() =>
  (auth.usuario?.nome ?? '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)
</script>

<template>
  <header class="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-surface-border bg-surface px-4 sm:px-6">
    <button class="text-ink md:hidden" aria-label="Abrir menu" @click="ui.sidebarMobileOpen = true">
      <i class="bi bi-list text-2xl" />
    </button>
    <div class="hidden flex-1 md:block" />
    <div class="flex items-center gap-3 sm:gap-4">
      <label class="relative hidden sm:block">
        <i class="bi bi-search pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Pesquisar..."
          class="w-48 rounded-btn border border-surface-border bg-surface-bg py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand-500 lg:w-72"
        />
      </label>
      <button class="relative text-ink-muted hover:text-ink" aria-label="Notificações">
        <i class="bi bi-bell text-lg" />
        <span class="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger-500" />
      </button>
      <button class="hidden text-ink-muted hover:text-ink sm:block" aria-label="Aplicativos">
        <i class="bi bi-grid-3x3-gap text-lg" />
      </button>
      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
        {{ initials || 'U' }}
      </div>
    </div>
  </header>
</template>
