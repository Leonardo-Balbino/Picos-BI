<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem } from 'reka-ui'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEmpresaStore } from '@/stores/useEmpresaStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useLojasStore } from '@/stores/useLojasStore'
import { useUiStore } from '@/stores/useUiStore'
import { iniciais } from '@/utils/statusMaps'

const auth = useAuthStore()
const empresa = useEmpresaStore()
const ui = useUiStore()
const router = useRouter()

const filters = useFiltersStore()
const lojasStore = useLojasStore()
const nomeEmpresa = computed(() => {
  if (auth.isMatrizAdmin) {
    if (filters.lojasSelecionadas.length === 1) {
      return lojasStore.lojas.find((loja) => loja.id === filters.lojasSelecionadas[0])?.nome || 'Picos BI'
    }
    return 'Picos BI — empresas independentes'
  }
  return empresa.dados?.fantasia || empresa.dados?.razaoSocial || auth.usuario?.nome || ''
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="no-print flex h-16 shrink-0 items-center justify-between gap-4 border-b border-surface-border bg-surface px-4 sm:px-6">
    <button
      class="-ml-2 flex min-h-11 min-w-11 items-center justify-center text-ink md:hidden"
      aria-label="Abrir menu"
      @click="ui.sidebarMobileOpen = true"
    >
      <i class="bi bi-list text-2xl" />
    </button>

    <div class="min-w-0 flex-1">
      <span v-if="empresa.carregando" class="inline-block h-4 w-40 animate-pulse rounded bg-surface-bg" />
      <span v-else class="truncate text-sm font-semibold text-ink">{{ nomeEmpresa }}</span>
    </div>

    <DropdownMenuRoot>
      <DropdownMenuTrigger class="flex items-center gap-2 rounded-full outline-none" aria-label="Menu do usuário">
        <img
          v-if="auth.usuario?.foto"
          :src="auth.usuario.foto"
          :alt="auth.usuario.nome"
          class="h-9 w-9 rounded-full object-cover"
          referrerpolicy="no-referrer"
        />
        <div v-else class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
          {{ iniciais(auth.usuario?.nome ?? '') || 'U' }}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          class="z-50 w-52 rounded-btn border border-surface-border bg-surface p-1 shadow-lg"
          :side-offset="8"
          align="end"
        >
          <div class="border-b border-surface-border px-3 py-2">
            <p class="truncate text-sm font-medium text-ink">{{ auth.usuario?.nome }}</p>
            <p class="truncate text-xs text-ink-muted">{{ auth.usuario?.email }}</p>
          </div>
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-bg"
            @select="router.push('/configuracoes')"
          >
            <i class="bi bi-gear" /> Configurações
          </DropdownMenuItem>
          <DropdownMenuItem
            class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-danger-700 outline-none data-[highlighted]:bg-danger-100"
            @select="handleLogout"
          >
            <i class="bi bi-box-arrow-right" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>
  </header>
</template>
