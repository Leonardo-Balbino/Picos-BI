<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' }>(), {
  variant: 'neutral',
})
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
    :class="{
      'bg-green-100 text-green-700': variant === 'success',
      'bg-danger-100 text-danger-700': variant === 'danger',
      'bg-warning-100 text-warning-700': variant === 'warning',
      'bg-brand-100 text-brand-700': variant === 'info',
      'bg-surface-bg text-ink-muted': variant === 'neutral',
    }"
  >
    <slot />
  </span>
</template>
