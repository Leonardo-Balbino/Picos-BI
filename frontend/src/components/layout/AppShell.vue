<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { useEmpresaStore } from '@/stores/useEmpresaStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'

import { useSyncStore } from '@/stores/useSyncStore'
import { useVendasStore } from '@/stores/useVendasStore'

// A identificação da empresa pertence à sessão atual, inclusive após trocar de usuário.
const empresa = useEmpresaStore()
empresa.$reset()
empresa.carregar()
useDimensoesStore().carregar()

const filters = useFiltersStore()
const { carregar, forcarAtualizacao } = useRecarregarDados()

watch(() => [filters.periodo, filters.range.inicio, filters.range.fim, filters.idCaixa, filters.lojasSelecionadas.join(',')], carregar, { immediate: true })

const sync = useSyncStore()
let timer: ReturnType<typeof setInterval> | undefined
let atualizando = false
async function verificarAtualizacao() {
  if (atualizando || document.hidden) return
  atualizando = true
  try {
    const mudou = await sync.consultar(filters.lojasSelecionadas.slice().sort().join(','))
    if (mudou || useVendasStore().erro) await forcarAtualizacao()
  } finally { atualizando = false }
}
watch(() => filters.lojasSelecionadas.join(','), () => { void sync.consultar(filters.lojasSelecionadas.slice().sort().join(',')) }, { immediate: true })
onMounted(() => {
  timer = setInterval(() => { void verificarAtualizacao() }, 60_000)
  document.addEventListener('visibilitychange', verificarAtualizacao)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', verificarAtualizacao)
})
</script>

<template>
  <div class="min-h-screen bg-surface-bg">
    <AppSidebar />
    <div class="flex min-h-screen flex-col md:pl-16 xl:pl-[260px]">
      <AppTopbar />
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
    <AppToast />
  </div>
</template>
