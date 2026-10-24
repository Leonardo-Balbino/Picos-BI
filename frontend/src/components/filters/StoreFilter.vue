<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLojasStore } from '@/stores/useLojasStore'
import type { Loja } from '@/types'

const filters = useFiltersStore()
const auth = useAuthStore()
const lojasStore = useLojasStore()

onMounted(() => {
  if (lojasStore.lojas.length === 0) {
    lojasStore.carregarLojas()
  }
})

// Lojas reais disponíveis respeitando RLS da franquia
const lojasDisponiveis = computed<Loja[]>(() => {
  if (lojasStore.lojas.length > 0) {
    let lista = [...lojasStore.lojas]
    if (!auth.isMatrizAdmin && auth.lojasAutorizadas.length > 0) {
      lista = lista.filter((l) => auth.lojasAutorizadas.includes(l.id))
    }
    return lista
  }
  return []
})

// Lojas atualmente selecionadas no filtro
const lojasSelecionadas = computed(() => {
  if (filters.lojasSelecionadas.length === 0) {
    // Vazio = todas as lojas disponíveis selecionadas (modo consolidado)
    return lojasDisponiveis.value.map((l) => l.id)
  }
  return filters.lojasSelecionadas
})

const isTodasSelecionadas = computed(() => {
  return (
    filters.lojasSelecionadas.length === 0 ||
    lojasDisponiveis.value.every((l) => filters.lojasSelecionadas.includes(l.id))
  )
})

const labelFiltro = computed(() => {
  if (lojasDisponiveis.value.length === 1) return lojasDisponiveis.value[0]!.nome
  if (isTodasSelecionadas.value) {
    if (!auth.isMatrizAdmin) {
      if (lojasDisponiveis.value.length === 1) {
        return lojasDisponiveis.value[0]?.nome ?? 'Minha Loja'
      }
      return `Total das minhas lojas (${lojasDisponiveis.value.length})`
    }
    return `Consolidado (${lojasDisponiveis.value.length} lojas)`
  }
  if (filters.lojasSelecionadas.length === 1) {
    const loja = lojasDisponiveis.value.find((l) => l.id === filters.lojasSelecionadas[0])
    return loja?.nome ?? '1 Loja selecionada'
  }
  return `Comparando ${filters.lojasSelecionadas.length} lojas`
})

function toggleLoja(id: string) {
  const atuais = [...lojasSelecionadas.value]
  const proximas = atuais.includes(id) ? atuais.filter((atual) => atual !== id) : [...atuais, id]
  if (proximas.length) filters.setLojas(proximas)
}

function selecionarTodas() {
  filters.limparLojas()
}
</script>

<template>
  <div class="relative inline-block text-left">
    <PopoverRoot>
      <PopoverTrigger
        class="inline-flex items-center gap-2 rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-colors hover:border-brand-300 hover:bg-surface-bg data-[state=open]:border-brand-500"
      >
        <i class="bi bi-shop text-brand-600" />
        <span class="max-w-[180px] truncate sm:max-w-none">{{ labelFiltro }}</span>
        <span
          v-if="filters.lojasSelecionadas.length > 1 && !isTodasSelecionadas"
          class="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700"
        >
          Lado a Lado
        </span>
        <i class="bi bi-chevron-down text-ink-muted text-[10px]" />
      </PopoverTrigger>

      <PopoverPortal>
        <PopoverContent
          class="z-50 w-72 rounded-card border border-surface-border bg-surface p-3 shadow-xl"
          :side-offset="6"
          align="start"
        >
          <div class="mb-2 flex items-center justify-between border-b border-surface-border pb-2">
            <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Filtrar empresas e unidades
            </span>
            <button
              v-if="lojasDisponiveis.length > 1"
              type="button"
              class="text-xs font-semibold text-brand-600 hover:underline"
              @click="selecionarTodas"
            >
              {{ auth.isMatrizAdmin ? 'Consolidar Todas' : 'Total das minhas lojas' }}
            </button>
          </div>

          <!-- RLS Notice se Franqueado -->
          <div
            v-if="!auth.isMatrizAdmin"
            class="mb-2.5 rounded bg-brand-50 p-2 text-[11px] text-brand-800"
          >
            <i class="bi bi-shield-check mr-1" />
            Acesso da empresa: apenas unidades autorizadas.
          </div>

          <!-- Opção Explícita de Consolidação (Total das Lojas) -->
          <div
            v-if="lojasDisponiveis.length > 1"
            class="mb-2 flex cursor-pointer items-center justify-between rounded-btn p-2 text-xs font-semibold transition-colors hover:bg-surface-bg border border-surface-border/60"
            :class="isTodasSelecionadas ? 'bg-brand-50 border-brand-300 text-brand-900' : 'text-ink'"
            @click="selecionarTodas"
          >
            <div class="flex items-center gap-2">
              <i class="bi bi-grid-fill text-brand-600" />
              <div>
                <p class="leading-tight">{{ auth.isMatrizAdmin ? 'Consolidar empresas selecionáveis' : 'Total das minhas lojas' }}</p>
                <p class="text-[10px] text-ink-muted leading-none mt-0.5">
                  Todas as {{ lojasDisponiveis.length }} unidades incluídas
                </p>
              </div>
            </div>
            <span v-if="isTodasSelecionadas" class="text-brand-600 text-xs font-bold">
              <i class="bi bi-check-circle-fill" />
            </span>
          </div>

          <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            <div
              v-for="loja in lojasDisponiveis"
              :key="loja.id"
              class="flex cursor-pointer items-center justify-between rounded-btn p-2 text-xs transition-colors hover:bg-surface-bg"
              :class="lojasSelecionadas.includes(loja.id) ? 'bg-brand-50/60 font-semibold text-brand-900' : 'text-ink'"
            >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="rounded border-surface-border text-brand-600 focus:ring-brand-500"
                  :checked="lojasSelecionadas.includes(loja.id)"
                  :aria-label="loja.nome"
                  :disabled="lojasSelecionadas.length === 1 && lojasSelecionadas.includes(loja.id)"
                  @change="toggleLoja(loja.id)"
                />
                <div>
                  <p class="leading-tight">{{ loja.nome }}</p>
                  <p class="text-[10px] text-ink-muted leading-none mt-0.5">{{ loja.cidade }} / {{ loja.uf }}</p>
                </div>
              </div>
              <span
                v-if="lojasSelecionadas.includes(loja.id)"
                class="text-brand-600 text-xs font-bold"
              >
                <i class="bi bi-check-lg" />
              </span>
              <button v-if="lojasDisponiveis.length > 1" type="button" class="ml-2 text-xs font-semibold text-brand-700" @click="filters.setLojas([loja.id])">Somente</button>
            </div>
          </div>

          <div class="mt-3 border-t border-surface-border pt-2 text-[11px] text-ink-muted flex items-center justify-between">
            <span>Selecione unidades ou use “Somente”</span>
            <span class="font-bold text-ink">{{ lojasSelecionadas.length }}/{{ lojasDisponiveis.length }}</span>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </div>
</template>
