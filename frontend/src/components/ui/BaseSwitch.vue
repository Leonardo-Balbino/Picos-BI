<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

const checked = defineModel<boolean>({ default: false })
</script>

<template>
  <SwitchRoot
    v-model="checked"
    class="relative h-6 w-11 shrink-0 rounded-full bg-surface-border transition-colors data-[state=checked]:bg-green-500"
  >
    <SwitchThumb
      class="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]"
    />
  </SwitchRoot>
</template>
