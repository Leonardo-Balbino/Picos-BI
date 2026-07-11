<script setup lang="ts">
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'

const open = defineModel<boolean>('open', { default: false })
defineProps<{ title?: string; description?: string }>()
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-ink/40" />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface p-6 shadow-lg focus:outline-none"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <DialogTitle v-if="title" class="text-lg font-semibold text-ink">{{ title }}</DialogTitle>
            <DialogDescription v-if="description" class="mt-1 text-sm text-ink-muted">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose class="text-ink-muted hover:text-ink">
            <i class="bi bi-x-lg" />
          </DialogClose>
        </div>
        <div class="mt-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="mt-6 flex justify-end gap-2">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
