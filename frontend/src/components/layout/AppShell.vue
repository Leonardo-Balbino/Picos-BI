<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import AppToast from '@/components/ui/AppToast.vue'
import { useEmpresaStore } from '@/stores/useEmpresaStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'

useEmpresaStore().carregar()
useDimensoesStore().carregar()

const filters = useFiltersStore()
const { carregar } = useRecarregarDados()

watch(() => [filters.periodo, filters.range.inicio, filters.range.fim], carregar, { immediate: true })
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
