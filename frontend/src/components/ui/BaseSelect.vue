<script setup lang="ts">
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
} from 'reka-ui'

const modelValue = defineModel<string>()
withDefaults(defineProps<{ options: { value: string; label: string }[]; placeholder?: string }>(), {
  placeholder: 'Selecionar...',
})
</script>

<template>
  <SelectRoot v-model="modelValue">
    <SelectTrigger
      class="inline-flex items-center justify-between gap-2 rounded-btn border border-surface-border bg-surface px-3 py-2 text-sm text-ink outline-none data-[placeholder]:text-ink-muted"
    >
      <SelectValue :placeholder="placeholder" />
      <SelectIcon>
        <i class="bi bi-chevron-down text-xs text-ink-muted" />
      </SelectIcon>
    </SelectTrigger>
    <SelectPortal>
      <SelectContent
        class="z-50 overflow-hidden rounded-btn border border-surface-border bg-surface shadow-lg"
        position="popper"
        :side-offset="4"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="opt in options"
            :key="opt.value"
            :value="opt.value"
            class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-surface-bg"
          >
            <SelectItemText>{{ opt.label }}</SelectItemText>
            <SelectItemIndicator>
              <i class="bi bi-check text-green-500" />
            </SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
