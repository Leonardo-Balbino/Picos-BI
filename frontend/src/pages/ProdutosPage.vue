<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import GlobalFilters from '@/components/filters/GlobalFilters.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useProdutosStore } from '@/stores/useProdutosStore'
import { useDimensoesStore } from '@/stores/useDimensoesStore'
import { useExportStore } from '@/stores/useExportStore'
import { usePagination } from '@/composables/usePagination'
import { formatNumber } from '@/utils/formatters'
import type { Produto } from '@/types'

const produtosStore = useProdutosStore()
const dimensoes = useDimensoesStore()
const exportStore = useExportStore()

onMounted(() => produtosStore.carregar())

const busca = ref('')
const linhasFiltradas = computed<Produto[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return produtosStore.catalogo
  return produtosStore.catalogo.filter(
    (p) => p.descricao.toLowerCase().includes(termo) || p.codigoBarras.toLowerCase().includes(termo),
  )
})
const { page, paginated } = usePagination(linhasFiltradas, 8)

watchEffect(() => {
  exportStore.registrar(
    'produtos',
    [
      { chave: 'descricao', rotulo: 'Descrição' },
      { chave: 'codigoBarras', rotulo: 'Código de Barras' },
      { chave: 'embalagem', rotulo: 'Embalagem' },
      { chave: 'ativo', rotulo: 'Status' },
    ],
    linhasFiltradas.value.map((p) => ({
      descricao: p.descricao,
      codigoBarras: p.codigoBarras,
      embalagem: p.embalagem,
      ativo: p.ativo ? 'Ativo' : 'Inativo',
    })),
  )
})

const columns: DataTableColumn[] = [
  { key: 'descricao', label: 'Descrição' },
  { key: 'codigoBarras', label: 'Código de Barras' },
  { key: 'embalagem', label: 'Embalagem' },
  { key: 'ativo', label: 'Status', align: 'center' },
]
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
      <PageHeader title="Produtos" subtitle="Catálogo geral de produtos cadastrados e saldo de estoque." />
      <RouterLink
        to="/mais-vendidos"
        class="inline-flex items-center gap-2 rounded-btn border border-brand-200 bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-100"
      >
        <i class="bi bi-trophy-fill text-amber-500" />
        <span>Ver Ranking dos Mais Vendidos</span>
        <i class="bi bi-arrow-right text-brand-500" />
      </RouterLink>
    </div>

    <GlobalFilters />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Itens em Estoque"
        :value="dimensoes.estoqueDisponivel ? formatNumber(dimensoes.totalItensEstoque) : 'Indisponível'"
        icon="bi-box-seam"
      />
      <KpiCard
        label="Produtos Ativos"
        :value="formatNumber(produtosStore.catalogo.filter((p) => p.ativo).length)"
        icon="bi-tags"
        suffix="Portfólio total"
      />
    </div>

    <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-ink">Catálogo de Produtos</p>
          <p class="text-xs text-ink-muted">Cadastro base (sem preço/estoque por item)</p>
        </div>
        <input
          v-model="busca"
          type="search"
          placeholder="Buscar descrição, código de barras..."
          class="w-full max-w-xs rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div class="mt-4">
        <div v-if="produtosStore.carregando" class="space-y-2">
          <SkeletonCard v-for="i in 4" :key="i" variant="table-row" />
        </div>
        <EmptyState
          v-else-if="produtosStore.erro"
          icon="bi-exclamation-triangle"
          title="Não foi possível carregar o catálogo"
          :description="produtosStore.erro"
        >
          <BaseButton variant="secondary" class="mt-3" @click="produtosStore.carregar">Tentar novamente</BaseButton>
        </EmptyState>
        <DataTable v-else :columns="columns" :rows="paginated" :row-key="(r) => r.codigoMercadoriaVariacao" empty-title="Nenhum produto encontrado">
          <template #cell-ativo="{ row }">
            <StatusBadge :variant="row.ativo ? 'success' : 'neutral'">{{ row.ativo ? 'Ativo' : 'Inativo' }}</StatusBadge>
          </template>
        </DataTable>
      </div>
      <div class="mt-4 flex flex-col items-start gap-2 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Mostrando {{ linhasFiltradas.length === 0 ? 0 : (page - 1) * 8 + 1 }}-{{ Math.min(page * 8, linhasFiltradas.length) }} de {{ linhasFiltradas.length }}</span>
        <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="8" />
      </div>
    </div>
  </div>
</template>
