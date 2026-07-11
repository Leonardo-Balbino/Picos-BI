<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger-ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
    disabled?: boolean
    icon?: string
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex shrink-0 items-center justify-center gap-2 rounded-btn font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
      variant === 'primary' &&
        'bg-gradient-to-r from-green-400 to-green-500 text-white shadow-sm hover:brightness-105',
      variant === 'secondary' &&
        'border border-surface-border bg-surface text-ink hover:bg-surface-bg',
      variant === 'danger-ghost' && 'bg-transparent text-danger-500 hover:bg-danger-100',
    ]"
    @click="(e) => $emit('click', e)"
  >
    <i v-if="icon" class="bi" :class="icon" />
    <slot />
  </button>
</template>
