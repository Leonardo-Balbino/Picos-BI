<script setup lang="ts">
import { useSyncStore } from '@/stores/useSyncStore'
const sync = useSyncStore()
</script>
<template>
  <div role="status" class="flex items-center gap-2 text-xs leading-relaxed" :class="sync.aviso ? 'text-amber-800' : 'text-emerald-800'">
    <i class="bi" :class="sync.carregando ? 'bi-arrow-repeat' : sync.aviso ? 'bi-exclamation-circle' : 'bi-check-circle-fill'" />
    <span>{{ sync.carregando ? 'Consultando atualização…' : sync.descricao }} <span class="text-ink-muted">· ciclo de 10 min</span></span>
  </div>
</template>
