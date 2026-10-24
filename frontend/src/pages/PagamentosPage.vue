<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import PagamentosResumo from '@/components/vendas/PagamentosResumo.vue'
import { useExportStore } from '@/stores/useExportStore'
import { useAggregations, type FormaPagamentoLinha } from '@/composables/useAggregations'
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters'

const exportStore = useExportStore()
const agg = useAggregations()

const formas = computed<FormaPagamentoLinha[]>(() => agg.porFormaPagamento())

watchEffect(() => {
  exportStore.registrar(
    'pagamentos',
    [
      { chave: 'label', rotulo: 'Forma' },
      { chave: 'nTransacoes', rotulo: 'Nº Transações' },
      { chave: 'valor', rotulo: 'Valor Total' },
      { chave: 'ticketMedio', rotulo: 'Ticket Médio' },
      { chave: 'percentual', rotulo: '% Faturamento' },
    ],
    formas.value.map((f) => ({
      label: f.label,
      nTransacoes: formatNumber(f.nTransacoes),
      valor: formatCurrency(f.valor),
      ticketMedio: formatCurrency(f.ticketMedio),
      percentual: formatPercent(f.percentual, true),
    })),
  )
})

</script>
<template>
  <div>
    <PageHeader title="Pagamentos" subtitle="Distribuição das vendas por forma de recebimento." />
    <GlobalFilters />
    <PagamentosResumo />
  </div>
</template>
