<script setup lang="ts">
import { computed } from 'vue'
import { ToggleGroupRoot, ToggleGroupItem, PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import BaseButton from '@/components/ui/BaseButton.vue'
import PeriodRangeCalendar from '@/components/filters/PeriodRangeCalendar.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import { formatDate } from '@/utils/formatters'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useUiStore } from '@/stores/useUiStore'
import { useVendasStore } from '@/stores/useVendasStore'
import { useRecarregarDados } from '@/composables/useRecarregarDados'
import type { PeriodoPreset } from '@/types'

withDefaults(defineProps<{ stacked?: boolean }>(), { stacked: false })

const filters = useFiltersStore()
const ui = useUiStore()
const vendas = useVendasStore()
const { forcarAtualizacao } = useRecarregarDados()

const periodos: { value: PeriodoPreset; label: string }[] = [
  { value: 'dia', label: 'Dia' },
  { value: 'dia-anterior', label: 'Dia anterior' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês atual' },
  { value: 'mes-anterior', label: 'Mês anterior' },
  { value: 'ano', label: '1 Ano' },
]

function obterDataIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function selecionarDiaAnteriorPersonalizado() {
  const agora = new Date()
  const ontem = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1)
  const iso = obterDataIso(ontem)
  filters.setRangePersonalizado(iso, iso)
}

function selecionarHojePersonalizado() {
  const hojeIso = obterDataIso(new Date())
  filters.setRangePersonalizado(hojeIso, hojeIso)
}

function selecionarDiasAtras(dias: number) {
  const agora = new Date()
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - (dias - 1))
  filters.setRangePersonalizado(obterDataIso(inicio), obterDataIso(agora))
}

function handlePopoverOpen(aberto: boolean) {
  if (aberto && (!filters.range.inicio || filters.periodo !== 'personalizado')) {
    selecionarDiaAnteriorPersonalizado()
  }
}

const podeAvancarDia = computed(() => {
  if (filters.periodo === 'dia-anterior') return true
  if (filters.periodo === 'personalizado' && filters.range.inicio) {
    const hoje = new Date()
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
    return filters.range.inicio < hojeIso
  }
  return false
})

function handleRangeChange(inicio: string, fim: string) {
  filters.setRangePersonalizado(inicio, fim)
}

async function handleAtualizar() {
  const ok = await forcarAtualizacao()
  ui.toast({ title: ok ? 'Dados do backend recarregados' : 'Não foi possível atualizar os dados', variant: ok ? 'success' : 'error' })
}
</script>

<template>
  <div :class="stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center gap-2'">
    <div :class="['flex flex-wrap items-center gap-2', stacked && 'w-full']">
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

        <PopoverRoot @update:open="handlePopoverOpen">
          <PopoverTrigger
            class="rounded-btn px-3 py-1.5 text-xs font-semibold text-ink-muted data-[state=open]:bg-brand-100 data-[state=open]:text-brand-700"
            :class="filters.periodo === 'personalizado' && 'bg-gradient-to-r from-green-400 to-green-500 text-white'"
          >
            Personalizado
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              class="z-50 w-80 rounded-card border border-surface-border bg-surface p-4 shadow-lg"
              :side-offset="8"
            >
              <div class="mb-3 flex items-center justify-between border-b border-surface-border pb-2">
                <span class="text-xs font-semibold text-ink">Período personalizado</span>
                <button
                  type="button"
                  class="rounded-btn bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                  @click="selecionarDiaAnteriorPersonalizado"
                >
                  <i class="bi bi-clock-history mr-1" />Dia anterior
                </button>
              </div>
              <div class="mb-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  class="rounded-btn bg-surface-bg px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                  @click="selecionarDiaAnteriorPersonalizado"
                >
                  Ontem
                </button>
                <button
                  type="button"
                  class="rounded-btn bg-surface-bg px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                  @click="selecionarHojePersonalizado"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  class="rounded-btn bg-surface-bg px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                  @click="selecionarDiasAtras(7)"
                >
                  7 dias
                </button>
                <button
                  type="button"
                  class="rounded-btn bg-surface-bg px-2 py-1 text-[11px] font-medium text-ink-muted hover:bg-brand-50 hover:text-brand-700"
                  @click="selecionarDiasAtras(30)"
                >
                  30 dias
                </button>
              </div>
              <p class="mb-2 text-xs text-ink-muted">
                <template v-if="filters.range.inicio && filters.range.fim">
                  {{ formatDate(filters.range.inicio) }} {{ filters.range.inicio !== filters.range.fim ? '— ' + formatDate(filters.range.fim) : '(Dia selecionado)' }}
                </template>
                <template v-else>Selecione uma data ou intervalo</template>
              </p>
              <PeriodRangeCalendar :inicio="filters.range.inicio" :fim="filters.range.fim" @change="handleRangeChange" />
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </ToggleGroupRoot>

      <div class="flex items-center gap-1 rounded-btn bg-surface-bg p-1">
        <button
          type="button"
          class="flex h-7 items-center gap-1 rounded-btn px-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink active:scale-95"
          title="Voltar para o dia anterior"
          @click="filters.voltarDiaAnterior()"
        >
          <i class="bi bi-chevron-left text-[11px]" />
          <span>Voltar dia</span>
        </button>
        <button
          v-if="podeAvancarDia"
          type="button"
          class="flex h-7 items-center gap-1 rounded-btn px-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface hover:text-ink active:scale-95"
          title="Avançar para o próximo dia"
          @click="filters.avancarProximoDia()"
        >
          <span>Avançar</span>
          <i class="bi bi-chevron-right text-[11px]" />
        </button>
      </div>
    </div>

    <StoreFilter />

    <div :class="stacked ? 'flex gap-2' : 'ml-auto flex items-center gap-2'">
      <BaseButton variant="secondary" icon="bi-arrow-clockwise" :disabled="vendas.carregando" @click="handleAtualizar">Atualizar</BaseButton>
    </div>
  </div>
</template>
