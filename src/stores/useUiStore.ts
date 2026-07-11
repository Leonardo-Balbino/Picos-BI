import { defineStore } from 'pinia'

export interface ToastItem {
  id: number
  title: string
  description?: string
  variant: 'success' | 'error' | 'info'
}

let nextToastId = 1

export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [] as ToastItem[],
    sidebarMobileOpen: false,
    filtersSheetOpen: false,
  }),
  actions: {
    toast(payload: { title: string; description?: string; variant?: ToastItem['variant'] }) {
      const id = nextToastId++
      this.toasts.push({ id, variant: 'info', ...payload })
      setTimeout(() => this.dismissToast(id), 4000)
    },
    dismissToast(id: number) {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    },
  },
})
