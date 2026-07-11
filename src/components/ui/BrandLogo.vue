<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 'light': losangos brancos/verdes para fundos escuros (sidebar, login). 'color': losangos roxo/verde para fundos claros. */
    variant?: 'light' | 'color'
    size?: number
  }>(),
  { variant: 'light', size: 36 },
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="6"
      y="14"
      width="22"
      height="22"
      rx="6"
      transform="rotate(-45 17 25)"
      :fill="variant === 'light' ? '#FFFFFF' : '#452C63'"
    />
    <rect
      x="20"
      y="14"
      width="22"
      height="22"
      rx="6"
      transform="rotate(-45 31 25)"
      fill="#3FBF8F"
    />
  </svg>
</template>
