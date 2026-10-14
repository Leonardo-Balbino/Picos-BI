<script setup lang="ts">
import { computed } from 'vue'
import { ToggleGroupRoot, ToggleGroupItem, PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PeriodRangeCalendar from '@/components/filters/PeriodRangeCalendar.vue'
import { formatDate } from '@/utils/formatters'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useUiStore } from '@/stores/useUiStore'
import { useVendasStore } from '@/stores/useVendasStore'
import { useExportStore } from '@/stores/useExportStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { exportarCsv } from '@/utils/exportar'
import type { PeriodoPreset } from '@/types'

withDefaults(defineProps<{ stacked?: boolean }>(), { stacked: false })

const filters = useFiltersStore()
const ui = useUiStore()
const vendas = useVendasStore()
const exportStore = useExportStore()
const { forcarAtualizacao } = useRecarregarDados()

const periodos: { value: PeriodoPreset; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Ano' },
]

const pdvOptions = computed(() => [
  { value: 'todos', label: 'Todos os PDVs' },
  ...vendas.idsCaixa.map((id) => ({ value: id, label: `Caixa ${id}` })),
])

function handleRangeChange(inicio: string, fim: string) {
  filters.setRangePersonalizado(inicio, fim)
}
function handleExportar() {
  if (exportStore.linhas.length === 0) {
    ui.toast({ title: 'Nada para exportar nesta tela', variant: 'info' })
    return
  }
  exportarCsv(exportStore.nomeArquivo, exportStore.colunas, exportStore.linhas)
  ui.toast({ title: 'CSV exportado', variant: 'success' })
}
async function handleAtualizar() {
  await forcarAtualizacao()
  ui.toast({ title: 'Dados atualizados', variant: 'success' })
}
</script>

<template>
  <div :class="stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2'">
    <ToggleGroupRoot
      v-model="filters.periodo"
      type="single"
      :class="['flex flex-wrap gap-1 rounded-btn bg-surface-bg p-1', stacked && 'w-full']"
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
            class="z-50 w-72 rounded-card border border-surface-border bg-surface p-4 shadow-lg"
            :side-offset="8"
          >
            <p class="mb-2 text-xs text-ink-muted">
              <template v-if="filters.range.inicio && filters.range.fim">
                {{ formatDate(filters.range.inicio) }} — {{ formatDate(filters.range.fim) }}
              </template>
              <template v-else>Selecione o início e o fim do período</template>
            </p>
            <PeriodRangeCalendar :inicio="filters.range.inicio" :fim="filters.range.fim" @change="handleRangeChange" />
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </ToggleGroupRoot>

    <BaseSelect v-model="filters.idCaixa" :options="pdvOptions" :class="stacked && 'w-full'" />

    <div :class="stacked ? 'flex gap-2' : 'ml-auto flex items-center gap-2'">
      <BaseButton variant="secondary" icon="bi-arrow-clockwise" @click="handleAtualizar">Atualizar</BaseButton>
      <BaseButton variant="primary" icon="bi-download" @click="handleExportar">Exportar</BaseButton>
    </div>
  </div>
</template>
