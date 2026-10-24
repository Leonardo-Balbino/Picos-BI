<script setup lang="ts">
import { computed } from 'vue'
import type { AtualizacaoOperacional } from '@/services/operacionalService'
import { formatDateTime } from '@/utils/formatters'
const props = defineProps<{ atualizacoes: AtualizacaoOperacional[] }>()
const maisAntiga = computed(() => props.atualizacoes.map(a => a.executadoEm).sort()[0])
const falhou = computed(() => props.atualizacoes.some(a => a.status !== 'SUCESSO'))
</script>
<template>
  <p class="my-4 text-xs text-ink-muted" role="status">
    <i class="bi bi-cloud-check mr-1" />
    {{ maisAntiga ? 'Dados importados do ERP em ' + formatDateTime(maisAntiga) : 'Aguardando a primeira importação do ERP.' }}
    <span v-if="atualizacoes.length > 1"> · referência mais antiga entre as unidades</span>
    · atualização do ERP a cada hora; esta tela confere o backend a cada minuto.
    <span v-if="falhou" class="font-semibold text-warning-700"> A última tentativa falhou; exibindo o último saldo disponível.</span>
  </p>
</template>
