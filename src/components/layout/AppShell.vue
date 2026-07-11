<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import AppToast from '@/components/ui/AppToast.vue'
</script>

<template>
  <div class="min-h-screen bg-surface-bg">
    <AppSidebar />
    <div class="flex min-h-screen flex-col md:pl-16 lg:pl-[260px]">
      <AppTopbar />
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
    <AppToast />
  </div>
</template>
