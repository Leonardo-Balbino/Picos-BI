<script setup lang="ts">
import { ref, watch } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useConfiguracoesStore } from '@/stores/useConfiguracoesStore'
import { useUiStore } from '@/stores/useUiStore'

const auth = useAuthStore()
const config = useConfiguracoesStore()
const ui = useUiStore()

const nomeComercio = ref('')
const cnpj = ref('')
const faturamentoMensalGlobal = ref(0)
const metaPorVendedorMedia = ref(0)
const periodoPadrao = ref('30d')
const moedaPadrao = ref('BRL')
const fusoHorario = ref('America/Sao_Paulo')
const relatoriosSemanaisPorEmail = ref(true)
const alertasMetaAtingida = ref(false)

function resetForm() {
  const dados = config.dados
  if (!dados) return
  nomeComercio.value = dados.organizacao.nomeComercio
  cnpj.value = dados.organizacao.cnpj
  faturamentoMensalGlobal.value = dados.metas.faturamentoMensalGlobal
  metaPorVendedorMedia.value = dados.metas.metaPorVendedorMedia
  periodoPadrao.value = dados.preferencias.periodoPadrao
  moedaPadrao.value = dados.preferencias.moedaPadrao
  fusoHorario.value = dados.preferencias.fusoHorario
  relatoriosSemanaisPorEmail.value = dados.preferencias.relatoriosSemanaisPorEmail
  alertasMetaAtingida.value = dados.preferencias.alertasMetaAtingida
}

watch(() => config.dados, resetForm, { immediate: true })

function salvar() {
  config.salvar({
    organizacao: { nomeComercio: nomeComercio.value, cnpj: cnpj.value },
    metas: {
      faturamentoMensalGlobal: faturamentoMensalGlobal.value,
      metaPorVendedorMedia: metaPorVendedorMedia.value,
    },
    preferencias: {
      periodoPadrao: periodoPadrao.value,
      moedaPadrao: moedaPadrao.value,
      fusoHorario: fusoHorario.value,
      relatoriosSemanaisPorEmail: relatoriosSemanaisPorEmail.value,
      alertasMetaAtingida: alertasMetaAtingida.value,
    },
  })
  ui.toast({ title: 'Configurações salvas', variant: 'success' })
}

function desvincular() {
  auth.desvincular()
  ui.toast({ title: 'Conta Google desvinculada', variant: 'info' })
}

function alterarLogo() {
  ui.toast({ title: 'Disponível em breve', variant: 'info' })
}

const periodoOptions = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mes', label: 'Mês atual' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'ano', label: 'Ano' },
]
const moedaOptions = [{ value: 'BRL', label: 'Real (R$)' }]
const fusoOptions = [{ value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' }]
</script>

<template>
  <div class="pb-20">
    <PageHeader title="Configurações" subtitle="Gerencie suas preferências, metas e dados da organização." />

    <div class="space-y-6">
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Perfil</p>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
              {{ auth.usuario?.nome?.slice(0, 2).toUpperCase() }}
            </span>
            <div>
              <p class="text-lg font-bold text-ink">{{ auth.usuario?.nome }}</p>
              <p class="text-sm text-ink-muted">{{ auth.usuario?.email }}</p>
              <StatusBadge :variant="auth.usuario?.contaGoogleVinculada ? 'success' : 'neutral'" class="mt-1">
                <i class="bi" :class="auth.usuario?.contaGoogleVinculada ? 'bi-patch-check-fill' : 'bi-slash-circle'" />
                {{ auth.usuario?.contaGoogleVinculada ? 'Conta Google vinculada' : 'Conta desvinculada' }}
              </StatusBadge>
            </div>
          </div>
          <BaseButton variant="danger-ghost" :disabled="!auth.usuario?.contaGoogleVinculada" @click="desvincular">
            Desvincular
          </BaseButton>
        </div>
      </div>

      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Organização</p>
        <div class="mb-4 flex items-center gap-3">
          <span class="flex h-14 w-14 items-center justify-center rounded-btn border border-surface-border bg-surface-bg text-xl text-ink-muted">
            <i class="bi bi-shop" />
          </span>
          <BaseButton variant="secondary" @click="alterarLogo">Alterar Logo</BaseButton>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Nome do Comércio</span>
            <input v-model="nomeComercio" type="text" class="rounded-btn border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">CNPJ</span>
            <input v-model="cnpj" type="text" class="rounded-btn border border-surface-border px-3 py-2 text-sm outline-none focus:border-brand-500" />
          </label>
        </div>
      </div>

      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Metas de Vendas</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Faturamento Mensal Global</span>
            <div class="flex items-center rounded-btn border border-surface-border focus-within:border-brand-500">
              <span class="pl-3 text-sm text-ink-muted">R$</span>
              <input v-model.number="faturamentoMensalGlobal" type="number" class="w-full rounded-btn px-2 py-2 text-right text-sm outline-none" />
            </div>
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Meta por Vendedor (Média)</span>
            <div class="flex items-center rounded-btn border border-surface-border focus-within:border-brand-500">
              <span class="pl-3 text-sm text-ink-muted">R$</span>
              <input v-model.number="metaPorVendedorMedia" type="number" class="w-full rounded-btn px-2 py-2 text-right text-sm outline-none" />
            </div>
          </label>
        </div>
      </div>

      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Preferências Regionais e Alertas</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Período Padrão</span>
            <BaseSelect v-model="periodoPadrao" :options="periodoOptions" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Moeda Padrão</span>
            <BaseSelect v-model="moedaPadrao" :options="moedaOptions" />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-xs font-medium text-ink-muted">Fuso Horário</span>
            <BaseSelect v-model="fusoHorario" :options="fusoOptions" />
          </label>
        </div>

        <div class="mt-6 space-y-4 border-t border-surface-border pt-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Relatórios Semanais por E-mail</p>
              <p class="text-xs text-ink-muted">Receba um resumo de vendas toda segunda-feira.</p>
            </div>
            <BaseSwitch v-model="relatoriosSemanaisPorEmail" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Alertas de Meta Atingida</p>
              <p class="text-xs text-ink-muted">Notificar quando a meta mensal for alcançada.</p>
            </div>
            <BaseSwitch v-model="alertasMetaAtingida" />
          </div>
        </div>
      </div>
    </div>

    <div class="fixed inset-x-0 bottom-0 z-20 flex justify-end gap-3 border-t border-surface-border bg-surface px-4 py-4 md:pl-16 xl:pl-[260px] xl:pr-8">
      <BaseButton variant="secondary" @click="resetForm">Cancelar</BaseButton>
      <BaseButton variant="primary" @click="salvar">Salvar alterações</BaseButton>
    </div>
  </div>
</template>
