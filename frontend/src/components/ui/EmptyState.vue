<script setup lang="ts">
withDefaults(defineProps<{ icon?: string; title: string; description?: string }>(), {
  icon: 'bi-inbox',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <i class="bi text-3xl text-ink-muted/40" :class="icon" />
    <p class="text-sm font-medium text-ink">{{ title }}</p>
    <p v-if="description" class="max-w-xs text-xs text-ink-muted">{{ description }}</p>
    <slot />
  </div>
</template>
