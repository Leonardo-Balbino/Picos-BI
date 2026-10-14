<script setup lang="ts">
import { ToastProvider, ToastViewport, ToastRoot, ToastTitle, ToastDescription, ToastClose } from 'reka-ui'
import { useUiStore } from '@/stores/useUiStore'

const ui = useUiStore()
</script>

<template>
  <ToastProvider :duration="4000">
    <ToastRoot
      v-for="t in ui.toasts"
      :key="t.id"
      class="flex items-start gap-3 rounded-card border border-surface-border bg-surface p-4 shadow-lg"
      @update:open="(v) => !v && ui.dismissToast(t.id)"
    >
      <i
        class="bi mt-0.5"
        :class="{
          'bi-check-circle-fill text-green-500': t.variant === 'success',
          'bi-exclamation-circle-fill text-danger-500': t.variant === 'error',
          'bi-info-circle-fill text-brand-700': t.variant === 'info',
        }"
      />
      <div class="min-w-0 flex-1">
        <ToastTitle class="text-sm font-semibold text-ink">{{ t.title }}</ToastTitle>
        <ToastDescription v-if="t.description" class="mt-0.5 text-xs text-ink-muted">
          {{ t.description }}
        </ToastDescription>
      </div>
      <ToastClose class="text-ink-muted hover:text-ink">
        <i class="bi bi-x-lg text-xs" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="no-print fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none" />
  </ToastProvider>
</template>
