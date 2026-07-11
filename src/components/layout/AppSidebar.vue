<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from 'reka-ui'
import BrandLogo from '@/components/ui/BrandLogo.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()

const navItems = [
  { to: '/visao-geral', label: 'Visão Geral', icon: 'bi-grid-1x2-fill' },
  { to: '/vendas', label: 'Vendas', icon: 'bi-graph-up-arrow' },
  { to: '/produtos', label: 'Produtos', icon: 'bi-box-seam-fill' },
  { to: '/clientes', label: 'Clientes', icon: 'bi-people-fill' },
  { to: '/vendedores', label: 'Vendedores', icon: 'bi-person-badge-fill' },
  { to: '/pagamentos', label: 'Pagamentos', icon: 'bi-credit-card-fill' },
  { to: '/relatorios', label: 'Relatórios', icon: 'bi-file-earmark-bar-graph-fill' },
  { to: '/configuracoes', label: 'Configurações', icon: 'bi-gear-fill' },
]

const initials = computed(() =>
  (auth.usuario?.nome ?? '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase(),
)

function isActive(to: string) {
  return route.path.startsWith(to)
}

function handleLogout() {
  auth.logout()
  ui.sidebarMobileOpen = false
  router.push('/login')
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col bg-brand-900 md:flex xl:w-[260px]"
  >
    <div class="flex items-center gap-3 px-4 py-5 xl:px-6">
      <BrandLogo :size="36" class="shrink-0" />
      <div class="hidden min-w-0 xl:block">
        <p class="truncate text-base font-bold leading-tight text-white">PICOS Analytics</p>
        <p class="truncate text-[11px] font-medium text-white/50">Business Intelligence</p>
      </div>
    </div>

    <nav class="mt-2 flex-1 space-y-1 px-2 xl:px-3">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        :title="item.label"
        class="flex items-center gap-3 rounded-btn border-l-[3px] border-transparent px-2.5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white xl:px-3"
        :class="isActive(item.to) && 'border-green-500 bg-white/10 text-white'"
      >
        <i class="bi shrink-0 text-lg" :class="item.icon" />
        <span class="hidden truncate xl:inline">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="flex items-center gap-3 border-t border-white/10 px-3 py-4 xl:px-4">
      <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
        {{ initials || 'U' }}
      </div>
      <div class="hidden min-w-0 flex-1 xl:block">
        <p class="truncate text-sm font-medium text-white">{{ auth.usuario?.nome ?? 'Usuário' }}</p>
        <button class="text-xs text-white/60 hover:text-white" @click="handleLogout">Sair</button>
      </div>
    </div>
  </aside>

  <DialogRoot v-model:open="ui.sidebarMobileOpen">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/40 md:hidden" />
      <DialogContent
        class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 focus:outline-none md:hidden"
      >
        <DialogTitle class="sr-only">Menu de navegação</DialogTitle>
        <div class="flex items-center gap-3 px-5 py-5">
          <BrandLogo :size="36" class="shrink-0" />
          <div class="min-w-0">
            <p class="truncate text-base font-bold leading-tight text-white">PICOS Analytics</p>
            <p class="truncate text-[11px] font-medium text-white/50">Business Intelligence</p>
          </div>
        </div>

        <nav class="mt-2 flex-1 space-y-1 px-3">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-btn border-l-[3px] border-transparent px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            :class="isActive(item.to) && 'border-green-500 bg-white/10 text-white'"
            @click="ui.sidebarMobileOpen = false"
          >
            <i class="bi text-lg" :class="item.icon" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="flex items-center gap-3 border-t border-white/10 px-4 py-4">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
            {{ initials || 'U' }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-white">{{ auth.usuario?.nome ?? 'Usuário' }}</p>
            <button class="text-xs text-white/60 hover:text-white" @click="handleLogout">Sair</button>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
