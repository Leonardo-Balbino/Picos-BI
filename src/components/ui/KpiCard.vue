<script setup lang="ts">
import { formatPercent } from '@/utils/formatters'

withDefaults(
  defineProps<{
    label: string
    value?: string
    icon?: string
    variation?: number
    variationLabel?: string
    suffix?: string
    progress?: number
    highlight?: boolean
  }>(),
  { variationLabel: 'vs. período anterior' },
)
</script>

<template>
  <div class="rounded-card p-5 shadow-sm" :class="highlight ? 'bg-brand-700 text-white' : 'bg-surface text-ink'">
    <div class="flex items-start justify-between gap-2">
      <span
        class="text-xs font-semibold uppercase tracking-wide"
        :class="highlight ? 'text-white/70' : 'text-ink-muted'"
      >
        {{ label }}
      </span>
      <span
        v-if="progress !== undefined"
        class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"
      >
        {{ formatPercent(progress, true) }}
      </span>
      <span
        v-else-if="icon"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        :class="highlight ? 'bg-white/15 text-white' : 'bg-brand-100 text-brand-700'"
      >
        <i class="bi" :class="icon" />
      </span>
    </div>

    <div v-if="progress !== undefined" class="mt-4 h-2 overflow-hidden rounded-full bg-surface-bg">
      <div
        class="h-full rounded-full bg-gradient-to-r from-green-400 to-green-500"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <template v-else>
      <p class="tabular-nums mt-3 text-2xl font-bold" :class="highlight ? 'text-white' : 'text-ink'">
        {{ value }}
      </p>
      <div v-if="variation !== undefined" class="mt-1 flex items-center gap-1 text-xs font-medium">
        <i
          class="bi"
          :class="[
            variation >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short',
            variation >= 0 ? 'text-green-500' : 'text-danger-500',
          ]"
        />
        <span :class="variation >= 0 ? 'text-green-500' : 'text-danger-500'">
          {{ formatPercent(Math.abs(variation), true) }}
        </span>
        <span :class="highlight ? 'text-white/60' : 'text-ink-muted'">{{ variationLabel }}</span>
      </div>
      <p v-else-if="suffix" class="mt-1 text-xs" :class="highlight ? 'text-white/70' : 'text-ink-muted'">
        {{ suffix }}
      </p>
    </template>
  </div>
</template>
