<script setup lang="ts">
import { computed } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PeriodRangeCalendar from '@/components/filters/PeriodRangeCalendar.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import { formatDate } from '@/utils/formatters'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useUiStore } from '@/stores/useUiStore'
import { useVendasStore } from '@/stores/useVendasStore'
import { useExportStore } from '@/stores/useExportStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import { exportarCsv } from '@/utils/exportar'
import { paraDataApi } from '@/utils/periodo'
import type { PeriodoPreset } from '@/types'

withDefaults(defineProps<{ stacked?: boolean }>(), { stacked: false })

const filters = useFiltersStore()
const ui = useUiStore()
const vendas = useVendasStore()
const exportStore = useExportStore()
const { forcarAtualizacao } = useRecarregarDados()

const periodos: { value: PeriodoPreset; label: string; icon?: string }[] = [
  { value: 'dia', label: 'Hoje', icon: 'bi-calendar-check' },
  { value: 'ontem', label: 'Ontem', icon: 'bi-clock-history' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'trimestre', label: '90 dias' },
  { value: 'ano', label: '1 Ano' },
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
  const ok = await forcarAtualizacao()
  ui.toast({
    title: ok ? 'Dados do backend recarregados' : 'Não foi possível atualizar os dados',
    variant: ok ? 'success' : 'error',
  })
}
</script>

<template>
  <div :class="stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2.5'">
    <!-- 1. Navegador Rápido de Dias (Day Stepper) -->
    <div
      class="flex items-center rounded-btn border border-surface-border bg-surface-bg p-0.5 shadow-xs transition-colors hover:border-brand-400"
      :class="stacked && 'w-full justify-between'"
    >
      <button
        type="button"
        title="Voltar 1 dia (Dia anterior)"
        class="flex h-7 w-7 items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-surface hover:text-ink cursor-pointer"
        @click="filters.irParaDiaAnterior"
      >
        <i class="bi bi-chevron-left text-xs" />
      </button>

      <!-- Label do Dia com Seletor Direto embutido -->
      <label
        class="relative flex items-center justify-center cursor-pointer px-2.5 py-1 text-xs font-semibold text-ink hover:text-brand-700 transition-colors"
        title="Clique para escolher qualquer dia diretamente no calendário"
      >
        <i class="bi bi-calendar3 mr-1.5 text-brand-600" />
        <span>{{ filters.rotuloDiaAtivo }}</span>
        <input
          type="date"
          :value="filters.dataAtivaIso"
          :max="paraDataApi(new Date())"
          class="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
          @input="(e) => filters.setDiaEspecifico((e.target as HTMLInputElement).value)"
        />
      </label>

      <button
        type="button"
        title="Avançar 1 dia (Dia seguinte)"
        :disabled="!filters.podeAvancarDia"
        class="flex h-7 w-7 items-center justify-center rounded-btn text-ink-muted transition-colors"
        :class="
          filters.podeAvancarDia
            ? 'hover:bg-surface hover:text-ink cursor-pointer'
            : 'opacity-30 cursor-not-allowed'
        "
        @click="filters.irParaDiaSeguinte"
      >
        <i class="bi bi-chevron-right text-xs" />
      </button>
    </div>

    <!-- 2. Atalhos de Período (Hoje, Ontem, Semana, Mês, 90d, 1a, Personalizado) -->
    <div
      class="flex flex-wrap items-center gap-1 rounded-btn bg-surface-bg p-1"
      :class="stacked && 'w-full'"
    >
      <button
        v-for="p in periodos"
        :key="p.value"
        type="button"
        class="rounded-btn px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer"
        :class="
          (filters.periodo === p.value || (p.value === 'ontem' && filters.periodo === 'dia-anterior'))
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-surface/60'
        "
        @click="filters.setPreset(p.value)"
      >
        <i v-if="p.icon" :class="['bi mr-1', p.icon]" />
        {{ p.label }}
      </button>

      <!-- Popover de Intervalo Livre -->
      <PopoverRoot>
        <PopoverTrigger
          class="rounded-btn px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
          :class="
            filters.periodo === 'personalizado' && !filters.isModoDia
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xs'
              : 'text-ink-muted hover:text-ink hover:bg-surface/60'
          "
        >
          <i class="bi bi-calendar-range mr-1" />
          Intervalo
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            class="z-50 w-72 rounded-card border border-surface-border bg-surface p-4 shadow-lg"
            :side-offset="8"
          >
            <p class="mb-2 text-xs text-ink-muted">
              <template v-if="filters.range.inicio && filters.range.fim && filters.range.inicio !== filters.range.fim">
                {{ formatDate(filters.range.inicio) }} — {{ formatDate(filters.range.fim) }}
              </template>
              <template v-else>Selecione o início e o fim do período</template>
            </p>
            <PeriodRangeCalendar :inicio="filters.range.inicio" :fim="filters.range.fim" @change="handleRangeChange" />
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>

    <!-- 3. Filtro de Loja/Unidade -->
    <StoreFilter />

    <!-- 4. Filtro de PDV/Caixa -->
    <BaseSelect v-model="filters.idCaixa" :options="pdvOptions" :class="stacked && 'w-full'" />

    <!-- 5. Ações (Atualizar e Exportar) -->
    <div :class="stacked ? 'flex gap-2' : 'ml-auto flex items-center gap-2'">
      <BaseButton variant="secondary" icon="bi-arrow-clockwise" @click="handleAtualizar">Atualizar</BaseButton>
      <BaseButton variant="primary" icon="bi-download" @click="handleExportar">Exportar</BaseButton>
    </div>
  </div>
</template>
