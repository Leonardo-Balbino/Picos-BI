<script setup lang="ts">
import { ToggleGroupRoot, ToggleGroupItem, PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useUiStore } from '@/stores/useUiStore'
import type { PeriodoPreset } from '@/types'

withDefaults(defineProps<{ stacked?: boolean }>(), { stacked: false })

const filters = useFiltersStore()
const ui = useUiStore()

const periodos: { value: PeriodoPreset; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: '7 Dias' },
  { value: '30d', label: '30 Dias' },
  { value: 'mes', label: 'Mês' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'ano', label: 'Ano' },
]

// Opções placeholder — substituídas por dados reais (lojas/categorias/vendedores) na camada de mocks/stores.
const lojaOptions = [
  { value: 'todas', label: 'Todas as Lojas' },
  { value: 'matriz', label: 'Loja Matriz' },
  { value: 'filial-sul', label: 'Filial Sul' },
]
const categoriaOptions = [{ value: 'todas', label: 'Todas as Categorias' }]
const formaPagamentoOptions = [
  { value: 'todas', label: 'Todas as Formas' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'credito', label: 'Cartão de Crédito' },
  { value: 'debito', label: 'Cartão de Débito' },
]
const vendedorOptions = [{ value: 'todos', label: 'Todos os Vendedores' }]

function handleInicioChange(e: Event) {
  filters.setRangePersonalizado((e.target as HTMLInputElement).value, filters.range.fim)
}
function handleFimChange(e: Event) {
  filters.setRangePersonalizado(filters.range.inicio, (e.target as HTMLInputElement).value)
}
function handleExportar() {
  ui.toast({ title: 'Exportação disponível em breve', variant: 'info' })
}
function handleAtualizar() {
  ui.toast({ title: 'Dados atualizados', variant: 'success' })
}
</script>

<template>
  <div :class="stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2'">
    <ToggleGroupRoot
      v-model="filters.periodo"
      type="single"
      :class="[
        'flex flex-wrap gap-1 rounded-btn bg-surface-bg p-1',
        stacked && 'w-full',
      ]"
    >
      <ToggleGroupItem
        v-for="p in periodos"
        :key="p.value"
        :value="p.value"
        class="rounded-btn px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors data-[state=on]:bg-gradient-to-r data-[state=on]:from-green-400 data-[state=on]:to-green-500 data-[state=on]:text-white"
      >
        {{ p.label }}
      </ToggleGroupItem>

      <PopoverRoot>
        <PopoverTrigger
          class="rounded-btn px-3 py-1.5 text-xs font-semibold text-ink-muted data-[state=open]:bg-brand-100 data-[state=open]:text-brand-700"
          :class="filters.periodo === 'personalizado' && 'bg-gradient-to-r from-green-400 to-green-500 text-white'"
        >
          Personalizado
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            class="z-50 w-56 rounded-card border border-surface-border bg-surface p-4 shadow-lg"
            :side-offset="8"
          >
            <div class="flex flex-col gap-3 text-sm">
              <label class="flex flex-col gap-1">
                <span class="text-xs text-ink-muted">Início</span>
                <input
                  type="date"
                  class="rounded-btn border border-surface-border px-2 py-1.5 text-sm"
                  :value="filters.range.inicio"
                  @change="handleInicioChange"
                />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-xs text-ink-muted">Fim</span>
                <input
                  type="date"
                  class="rounded-btn border border-surface-border px-2 py-1.5 text-sm"
                  :value="filters.range.fim"
                  @change="handleFimChange"
                />
              </label>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </ToggleGroupRoot>

    <BaseSelect v-model="filters.lojaId" :options="lojaOptions" :class="stacked && 'w-full'" />
    <BaseSelect v-model="filters.categoriaId" :options="categoriaOptions" :class="stacked && 'w-full'" />
    <BaseSelect v-model="filters.formaPagamento" :options="formaPagamentoOptions" :class="stacked && 'w-full'" />
    <BaseSelect v-model="filters.vendedorId" :options="vendedorOptions" :class="stacked && 'w-full'" />

    <div :class="stacked ? 'flex gap-2' : 'ml-auto flex items-center gap-2'">
      <BaseButton variant="secondary" icon="bi-arrow-clockwise" @click="handleAtualizar">Atualizar</BaseButton>
      <BaseButton variant="primary" icon="bi-download" @click="handleExportar">Exportar</BaseButton>
    </div>
  </div>
</template>
