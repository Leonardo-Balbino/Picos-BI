<script setup lang="ts">
import { computed } from 'vue'
import {
  RangeCalendarRoot,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarPrev,
  RangeCalendarNext,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarGridBody,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  type DateRange,
} from 'reka-ui'
import { parseDate, today, getLocalTimeZone } from '@internationalized/date'
import { JANELA_MAXIMA_DIAS } from '@/utils/periodo'

const props = defineProps<{ inicio: string; fim: string }>()
const emit = defineEmits<{ change: [inicio: string, fim: string] }>()

function paraCalendarDate(valor: string) {
  return valor ? parseDate(valor) : undefined
}

const modelValue = computed<DateRange>({
  get: () => ({ start: paraCalendarDate(props.inicio), end: paraCalendarDate(props.fim) }),
  set: (range) => {
    if (range.start && range.end) emit('change', range.start.toString(), range.end.toString())
  },
})

// O backend só mantém uma janela rolante de `JANELA_MAXIMA_DIAS` (ver `utils/periodo.ts`) —
// desabilita no próprio calendário qualquer dia fora dela, em vez de deixar escolher e só
// rejeitar depois no `422` do backend. Sem dado futuro também, então `hoje` é o teto.
const hoje = today(getLocalTimeZone())
const dataMinima = hoje.subtract({ days: JANELA_MAXIMA_DIAS })
</script>

<template>
  <RangeCalendarRoot
    v-slot="{ grid, weekDays }"
    v-model="modelValue"
    locale="pt-BR"
    :week-starts-on="0"
    :min-value="dataMinima"
    :max-value="hoje"
  >
    <RangeCalendarHeader class="flex items-center justify-between pb-2">
      <RangeCalendarPrev
        class="flex h-7 w-7 items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <i class="bi bi-chevron-left text-xs" />
      </RangeCalendarPrev>
      <RangeCalendarHeading v-slot="{ headingValue }" class="text-sm font-semibold text-ink">
        {{ headingValue.charAt(0).toUpperCase() + headingValue.slice(1) }}
      </RangeCalendarHeading>
      <RangeCalendarNext
        class="flex h-7 w-7 items-center justify-center rounded-btn text-ink-muted transition-colors hover:bg-surface-bg hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <i class="bi bi-chevron-right text-xs" />
      </RangeCalendarNext>
    </RangeCalendarHeader>

    <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()" class="w-full border-collapse">
      <RangeCalendarGridHead>
        <RangeCalendarGridRow class="grid grid-cols-7">
          <RangeCalendarHeadCell v-for="day in weekDays" :key="day" class="text-center text-[11px] font-semibold uppercase text-ink-muted">
            {{ day.slice(0, 2) }}
          </RangeCalendarHeadCell>
        </RangeCalendarGridRow>
      </RangeCalendarGridHead>
      <RangeCalendarGridBody>
        <RangeCalendarGridRow v-for="(weekDates, index) in month.rows" :key="`semana-${index}`" class="mt-1 grid grid-cols-7">
          <RangeCalendarCell v-for="weekDate in weekDates" :key="weekDate.toString()" :date="weekDate">
            <RangeCalendarCellTrigger
              :day="weekDate"
              :month="month.value"
              class="flex h-8 w-8 items-center justify-center text-xs text-ink outline-none transition-colors data-[outside-view]:text-ink-muted/40 data-[today]:font-bold data-[highlighted]:bg-brand-100 data-[selected]:bg-brand-100 data-[selection-start]:rounded-l-btn data-[selection-start]:bg-brand-500 data-[selection-start]:text-white data-[selection-end]:rounded-r-btn data-[selection-end]:bg-brand-500 data-[selection-end]:text-white data-[disabled]:pointer-events-none data-[disabled]:text-ink-muted/20 hover:bg-brand-100"
            />
          </RangeCalendarCell>
        </RangeCalendarGridRow>
      </RangeCalendarGridBody>
    </RangeCalendarGrid>
  </RangeCalendarRoot>
</template>
