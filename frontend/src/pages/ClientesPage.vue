<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useClientesStore } from '@/stores/useClientesStore'
import { usePagination } from '@/composables/usePagination'
import { iniciais, corAvatar } from '@/utils/statusMaps'
import { formatNumber } from '@/utils/formatters'
import { exportarCsv } from '@/utils/exportar'
import type { Pessoa } from '@/types'

const clientesStore = useClientesStore()
onMounted(() => clientesStore.carregar())

const busca = ref('')
const linhasFiltradas = computed<Pessoa[]>(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return clientesStore.pessoas
  return clientesStore.pessoas.filter(
    (p) => p.fantasia.toLowerCase().includes(termo) || p.razaoSocial.toLowerCase().includes(termo) || p.cnpjCpf.includes(termo),
  )
})
const { page, paginated } = usePagination(linhasFiltradas, 8)

function exportar() {
  exportarCsv(
    'clientes',
    [
      { chave: 'nome', rotulo: 'Cliente' },
      { chave: 'cnpjCpf', rotulo: 'CNPJ/CPF' },
      { chave: 'email', rotulo: 'E-mail' },
      { chave: 'telefone', rotulo: 'Telefone' },
      { chave: 'uf', rotulo: 'UF' },
      { chave: 'ativo', rotulo: 'Status' },
    ],
    linhasFiltradas.value.map((p) => ({
      nome: p.fantasia || p.razaoSocial,
      cnpjCpf: p.cnpjCpf,
      email: p.contato.email ?? '',
      telefone: p.contato.celular ?? p.contato.fone ?? '',
      uf: p.uf ?? '',
      ativo: p.ativo ? 'Ativo' : 'Inativo',
    })),
  )
}

const columns: DataTableColumn[] = [
  { key: 'fantasia', label: 'Cliente' },
  { key: 'cnpjCpf', label: 'CNPJ/CPF' },
  { key: 'contato', label: 'Contato' },
  { key: 'uf', label: 'UF' },
  { key: 'ativo', label: 'Status', align: 'center' },
]
</script>

<template>
  <div>
    <PageHeader title="Clientes" subtitle="Cadastro de clientes e fornecedores." />

    <div class="rounded-card bg-surface p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-semibold text-ink">
          {{ formatNumber(clientesStore.pessoas.length) }} cliente(s) cadastrado(s)
        </p>
        <div class="flex w-full max-w-xs items-center gap-2 sm:w-auto">
          <input
            v-model="busca"
            type="search"
            placeholder="Buscar nome, CNPJ/CPF..."
            class="w-full rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <BaseButton variant="secondary" icon="bi-download" @click="exportar">Exportar</BaseButton>
        </div>
      </div>

      <div class="mt-4">
        <div v-if="clientesStore.carregando" class="space-y-2">
          <SkeletonCard v-for="i in 5" :key="i" variant="table-row" />
          <p v-if="clientesStore.progresso.totalPaginas > 1" class="text-xs text-ink-muted">
            Carregando clientes… página {{ clientesStore.progresso.pagina }} de {{ clientesStore.progresso.totalPaginas }}
          </p>
        </div>
        <EmptyState
          v-else-if="clientesStore.erro"
          icon="bi-exclamation-triangle"
          title="Não foi possível carregar os clientes"
          :description="clientesStore.erro"
        >
          <BaseButton variant="secondary" class="mt-3" @click="clientesStore.carregar">Tentar novamente</BaseButton>
        </EmptyState>
        <DataTable v-else :columns="columns" :rows="paginated" :row-key="(r) => r.codigo" empty-title="Nenhum cliente encontrado">
          <template #cell-fantasia="{ row }">
            <span class="flex items-center gap-2">
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                :style="{ backgroundColor: corAvatar(row.fantasia || row.razaoSocial) }"
              >
                {{ iniciais(row.fantasia || row.razaoSocial) }}
              </span>
              {{ row.fantasia || row.razaoSocial }}
            </span>
          </template>
          <template #cell-contato="{ row }">
            <div class="text-xs">
              <p v-if="row.contato.email">{{ row.contato.email }}</p>
              <p v-if="row.contato.celular || row.contato.fone" class="text-ink-muted">{{ row.contato.celular || row.contato.fone }}</p>
            </div>
          </template>
          <template #cell-uf="{ row }">{{ row.uf || '—' }}</template>
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
