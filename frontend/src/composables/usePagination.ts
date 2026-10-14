import { computed, ref, watch, type Ref } from 'vue'

export function usePagination<T>(items: Ref<T[]>, itemsPerPage = 10) {
  const page = ref(1)

  watch(items, () => {
    page.value = 1
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / itemsPerPage)))

  const paginated = computed(() => {
    const start = (page.value - 1) * itemsPerPage
    return items.value.slice(start, start + itemsPerPage)
  })

  return { page, totalPages, paginated, itemsPerPage }
}
