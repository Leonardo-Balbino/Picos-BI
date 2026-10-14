<script setup lang="ts">
export interface RankingItem {
  id: string
  rank?: number
  avatarText?: string
  avatarColor?: string
  title: string
  subtitle?: string
  value: string
  meta?: string
  progress?: number
  progressColor?: string
}

defineProps<{ items: RankingItem[] }>()
</script>

<template>
  <ul class="divide-y divide-surface-border">
    <li v-for="item in items" :key="item.id" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span v-if="item.rank" class="w-5 shrink-0 text-center text-sm font-semibold text-ink-muted">
        {{ item.rank }}
      </span>
      <span
        v-if="item.avatarText"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        :style="{ backgroundColor: item.avatarColor ?? '#452C63' }"
      >
        {{ item.avatarText }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-ink">{{ item.title }}</p>
        <p v-if="item.subtitle" class="truncate text-xs text-ink-muted">{{ item.subtitle }}</p>
        <div
          v-if="item.progress !== undefined"
          class="mt-1.5 h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-surface-bg"
        >
          <div
            class="h-full rounded-full"
            :style="{ width: `${item.progress}%`, backgroundColor: item.progressColor ?? '#3FBF8F' }"
          />
        </div>
      </div>
      <div class="shrink-0 text-right">
        <p class="tabular-nums text-sm font-semibold text-ink">{{ item.value }}</p>
        <p v-if="item.meta" class="text-xs text-ink-muted">{{ item.meta }}</p>
      </div>
    </li>
  </ul>
</template>
