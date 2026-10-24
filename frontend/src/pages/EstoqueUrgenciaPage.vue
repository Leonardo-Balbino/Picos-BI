<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui'
import PageHeader from '@/components/layout/PageHeader.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { usePagination } from '@/composables/usePagination'
import {
  getEstoqueUrgencia,
  type EstoqueUrgencia,
  type ProdutoEstoque,
  type SecaoEstoque,
} from '@/services/operacionalService'

const filters = useFiltersStore()
const dados = ref<EstoqueUrgencia | null>(null)
const carregando = ref(false)
const erro = ref('')
const detalhe = ref<ProdutoEstoque | null>(null)
const modal = ref(false)

// Filtros locais e ordenação
const busca = ref('')
const secaoSelecionada = ref<string>('todas')
const ordenarPor = ref<'nome' | 'saldoAsc' | 'saldoDesc' | 'status'>('nome')

let pedido = 0
let timer: ReturnType<typeof setInterval> | undefined

const quantidade = (n: number | null) =>
  n === null ? '0' : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

async function carregar(silencioso = false) {
  const atual = ++pedido
  if (!silencioso) carregando.value = true
  erro.value = ''
  try {
    const idsLojas = filters.lojasSelecionadas.slice().sort().join(',')
    const r = await getEstoqueUrgencia(idsLojas, undefined, secaoSelecionada.value)
    if (atual === pedido) {
      dados.value = r
      if (detalhe.value) {
        detalhe.value =
          r.items.find(
            (i) => i.codigo === detalhe.value?.codigo && i.idLoja === detalhe.value?.idLoja,
          ) ?? null
      }
    }
  } catch (e) {
    if (atual === pedido) {
      erro.value = e instanceof Error ? e.message : 'Não foi possível consultar o estoque.'
    }
  } finally {
    if (atual === pedido) carregando.value = false
  }
}

// Seções dinâmicas do banco/API
const listaSecoes = computed<SecaoEstoque[]>(() => {
  const secoes = dados.value?.secoes ?? []
  if (secoes.length > 0) return secoes

  // Fallback: extrai das mercadorias carregadas
  const map = new Map<string, { id: string; descricao: string; totalItens: number }>()
  for (const item of dados.value?.items ?? []) {
    const id = (item.idSecao as string) || '1'
    const desc = (item.nomeSecao as string) || (id === '2' ? 'Insumos' : 'Produtos')
    const atual = map.get(id) ?? { id, descricao: desc, totalItens: 0 }
    atual.totalItens++
    map.set(id, atual)
  }
  return [...map.values()].sort((a, b) => a.descricao.localeCompare(b.descricao))
})

// Locais de estoque
const locaisEstoque = computed(() => {
  const catalogo =
    dados.value?.locais ??
    (dados.value?.items ?? []).flatMap((p) => p.locais.map((l) => ({ ...l, idLoja: p.idLoja })))
  const unicos = [...new Map(catalogo.map((l) => [l.id, l])).values()]
  const ordem = (nome: string) =>
    nome.toLocaleLowerCase('pt-BR') === 'loja'
      ? 0
      : nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === 'fabrica'
        ? 1
        : 2
  return unicos.sort(
    (a, b) => ordem(a.descricao) - ordem(b.descricao) || a.descricao.localeCompare(b.descricao, 'pt-BR'),
  )
})

function saldoLocal(row: ProdutoEstoque, id: string): number {
  return row.locais.find((l) => l.id === id)?.saldoFisico ?? 0
}

// Linhas filtradas por Seção, Busca e Ordenadas
const linhasFiltradas = computed(() => {
  let lista = [...(dados.value?.items ?? [])]

  // Filtro por seção dinâmico
  if (secaoSelecionada.value !== 'todas') {
    lista = lista.filter(
      (p) => String(p.idSecao ?? '1') === secaoSelecionada.value || p.nomeSecao === secaoSelecionada.value,
    )
  }

  // Filtro por texto
  if (busca.value.trim()) {
    const termo = busca.value.toLowerCase().trim()
    lista = lista.filter(
      (p) =>
        p.descricao.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        (p.nomeSecao && p.nomeSecao.toLowerCase().includes(termo)),
    )
  }

  // Ordenação
  return lista.sort((a, b) => {
    if (ordenarPor.value === 'saldoAsc') {
      return (a.saldoDisponivel ?? 0) - (b.saldoDisponivel ?? 0)
    }
    if (ordenarPor.value === 'saldoDesc') {
      return (b.saldoDisponivel ?? 0) - (a.saldoDisponivel ?? 0)
    }
    if (ordenarPor.value === 'status') {
      const prioridade: Record<string, number> = { RUPTURA: 0, BAIXO: 1, SEM_SALDO: 2, SEM_MINIMO: 3, REGULAR: 4 }
      return (prioridade[a.status] ?? 9) - (prioridade[b.status] ?? 9) || a.descricao.localeCompare(b.descricao, 'pt-BR')
    }
    return a.descricao.localeCompare(b.descricao, 'pt-BR')
  })
})

// KPIs de estoque
const kpisEstoque = computed(() => {
  const itens = dados.value?.items ?? []
  const total = itens.length
  const negativos = itens.filter((i) => (i.saldoDisponivel ?? 0) < 0).length
  const zerados = itens.filter((i) => i.saldoDisponivel === 0 || i.saldoFisico === 0).length
  const regulares = itens.filter((i) => (i.saldoDisponivel ?? 0) > 0).length

  return { total, regulares, zerados, negativos }
})

const { page, paginated } = usePagination(linhasFiltradas, 15)

const columns = computed<DataTableColumn[]>(() => [
  { key: 'descricao', label: 'Produto' },
  { key: 'secao', label: 'Seção / Depto' },
  ...locaisEstoque.value.map((l) => ({ key: 'local:' + l.id, label: l.descricao, align: 'right' as const })),
  { key: 'saldoFisico', label: 'Total Físico', align: 'right' },
  { key: 'statusBadge', label: 'Situação', align: 'center' },
  { key: 'acao', label: 'Detalhes', align: 'center' },
])

function abrir(row: ProdutoEstoque) {
  detalhe.value = row
  modal.value = true
}

function verificar() {
  if (!document.hidden && !carregando.value) void carregar(true)
}

watch(
  () => filters.lojasSelecionadas.join(','),
  () => {
    detalhe.value = null
    modal.value = false
    dados.value = null
    void carregar()
  },
)

onMounted(() => {
  void carregar()
  timer = setInterval(verificar, 60_000)
  document.addEventListener('visibilitychange', verificar)
})

onUnmounted(() => {
  pedido++
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', verificar)
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      title="Estoque"
      subtitle="Controle analítico de saldos por local, monitoramento de ruptura e seções."
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <StoreFilter />
      <BaseButton
        variant="secondary"
        icon="bi-arrow-clockwise"
        :loading="carregando"
        @click="carregar()"
      >
        Atualizar estoque
      </BaseButton>
    </div>

    <!-- KPIs do Estoque -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Itens Monitorados"
        :value="String(kpisEstoque.total)"
        icon="bi-boxes"
        tone="brand"
      />
      <KpiCard
        label="Estoque Positivo"
        :value="String(kpisEstoque.regulares)"
        icon="bi-check2-circle"
      />
      <KpiCard
        label="Estoque Zerado"
        :value="String(kpisEstoque.zerados)"
        icon="bi-dash-circle"
      />
      <KpiCard
        label="Estoque Negativo"
        :value="String(kpisEstoque.negativos)"
        icon="bi-exclamation-octagon"
      />
    </div>

    <!-- Container da Tabela com Filtros de Seção e Busca -->
    <div class="rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-surface-border/50 pb-4">
        <!-- Filtro por Seções Dinâmico (Tabs/Pills) -->
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="mr-2 text-xs font-semibold text-ink-muted">Seção:</span>
          <button
            type="button"
            class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            :class="
              secaoSelecionada === 'todas'
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-surface-bg text-ink-muted hover:text-ink'
            "
            @click="secaoSelecionada = 'todas'"
          >
            Todas ({{ kpisEstoque.total }})
          </button>
          <button
            v-for="secao in listaSecoes"
            :key="secao.id"
            type="button"
            class="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            :class="
              secaoSelecionada === secao.id
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-surface-bg text-ink-muted hover:text-ink'
            "
            @click="secaoSelecionada = secao.id"
          >
            {{ secao.descricao }} ({{ secao.totalItens }})
          </button>
        </div>

        <!-- Busca e Ordenação -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="relative w-60">
            <i class="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted" />
            <input
              v-model="busca"
              type="text"
              placeholder="Buscar produto ou código..."
              class="w-full rounded-btn border border-surface-border bg-surface-bg py-1.5 pl-8 pr-3 text-xs text-ink placeholder-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div class="inline-flex rounded-btn bg-surface-bg p-1 text-xs font-semibold">
            <button
              type="button"
              class="rounded-btn px-2.5 py-1 transition-colors"
              :class="ordenarPor === 'nome' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
              title="Ordem alfabética"
              @click="ordenarPor = 'nome'"
            >
              A-Z
            </button>
            <button
              type="button"
              class="rounded-btn px-2.5 py-1 transition-colors"
              :class="ordenarPor === 'saldoDesc' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
              title="Maior saldo físico"
              @click="ordenarPor = 'saldoDesc'"
            >
              Maior Saldo
            </button>
            <button
              type="button"
              class="rounded-btn px-2.5 py-1 transition-colors"
              :class="ordenarPor === 'saldoAsc' ? 'bg-brand-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'"
              title="Menor saldo / Alerta"
              @click="ordenarPor = 'saldoAsc'"
            >
              Menor Saldo
            </button>
          </div>
        </div>
      </div>

      <!-- Carregamento e Mensagens -->
      <div v-if="carregando" class="space-y-2">
        <SkeletonCard v-for="i in 5" :key="i" variant="table-row" />
      </div>

      <EmptyState
        v-else-if="erro"
        title="Não foi possível atualizar o estoque"
        :description="erro"
      >
        <BaseButton variant="secondary" class="mt-3" @click="carregar()">Tentar novamente</BaseButton>
      </EmptyState>

      <!-- Tabela -->
      <template v-else>
        <!-- Mobile cards -->
        <div class="space-y-3 md:hidden">
          <EmptyState
            v-if="!paginated.length"
            title="Nenhum produto encontrado"
            description="Não há produtos ativos com os filtros selecionados."
          />
          <article
            v-for="row in paginated"
            :key="row.idLoja + ':' + row.codigo"
            class="rounded-btn border border-surface-border bg-surface p-4 shadow-sm"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <button
                  class="text-left font-semibold text-brand-700 hover:underline"
                  @click="abrir(row)"
                >
                  {{ row.descricao }}
                </button>
                <p class="text-[11px] text-ink-muted">
                  Seção: {{ row.nomeSecao || 'Geral' }} · Cód: {{ row.codigo }}
                </p>
              </div>

              <!-- Badge de situação com tratamento para negativo / zerado -->
              <span
                v-if="(row.saldoFisico ?? 0) < 0"
                class="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800"
              >
                Negativo
              </span>
              <span
                v-else-if="(row.saldoFisico ?? 0) === 0"
                class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
              >
                Zerado
              </span>
              <span
                v-else
                class="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
              >
                Normal
              </span>
            </div>

            <div class="mt-3 space-y-1.5 border-t border-surface-border/50 pt-3 text-xs">
              <div
                v-for="local in locaisEstoque"
                :key="local.id"
                class="flex items-center justify-between text-ink-muted"
              >
                <span>{{ local.descricao }}</span>
                <span>{{ quantidade(saldoLocal(row, local.id)) }}</span>
              </div>
              <div class="flex items-center justify-between border-t border-surface-border pt-1 font-bold text-ink">
                <span>Total Físico</span>
                <span :class="(row.saldoFisico ?? 0) < 0 ? 'text-red-600' : ''">
                  {{ quantidade(row.saldoFisico ?? 0) }}
                </span>
              </div>
            </div>

            <div class="mt-3 flex justify-end">
              <BaseButton variant="secondary" size="sm" @click="abrir(row)">
                Ver estoque
              </BaseButton>
            </div>
          </article>
        </div>

        <!-- Desktop DataTable -->
        <div class="hidden md:block">
          <DataTable
            :columns="columns"
            :rows="paginated"
            :row-key="(r) => r.idLoja + ':' + r.codigo"
            empty-title="Nenhum produto encontrado"
            empty-description="Não há produtos ativos com os filtros selecionados."
          >
            <template #cell-descricao="{ row }">
              <button
                class="text-left font-semibold text-brand-700 hover:underline"
                @click="abrir(row)"
              >
                {{ row.descricao }}
              </button>
            </template>

            <template #cell-secao="{ row }">
              <span class="inline-flex rounded-full bg-surface-bg px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                {{ row.nomeSecao || 'Geral' }}
              </span>
            </template>

            <template
              v-for="local in locaisEstoque"
              :key="local.id"
              #[`cell-local:${local.id}`]="{ row }"
            >
              <span :class="saldoLocal(row, local.id) < 0 ? 'text-red-600 font-bold' : ''">
                {{ quantidade(saldoLocal(row, local.id)) }}
              </span>
            </template>

            <template #cell-saldoFisico="{ row }">
              <span
                class="font-bold tabular-nums"
                :class="(row.saldoFisico ?? 0) < 0 ? 'text-red-600' : (row.saldoFisico ?? 0) === 0 ? 'text-ink-muted' : 'text-ink'"
              >
                {{ quantidade(row.saldoFisico ?? 0) }}
              </span>
            </template>

            <template #cell-statusBadge="{ row }">
              <span
                v-if="(row.saldoFisico ?? 0) < 0"
                class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800"
              >
                Negativo
              </span>
              <span
                v-else-if="(row.saldoFisico ?? 0) === 0"
                class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700"
              >
                Zerado
              </span>
              <span
                v-else
                class="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
              >
                Normal
              </span>
            </template>

            <template #cell-acao="{ row }">
              <BaseButton variant="secondary" size="sm" @click="abrir(row)">
                Ver estoque
              </BaseButton>
            </template>
          </DataTable>
        </div>
      </template>

      <!-- Paginação -->
      <div
        v-if="!carregando && !erro && linhasFiltradas.length > 0"
        class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-surface-border/50 pt-3 text-xs text-ink-muted"
      >
        <span>Exibindo {{ linhasFiltradas.length }} produto(s)</span>
        <Pagination v-model:page="page" :total="linhasFiltradas.length" :items-per-page="15" />
      </div>
    </div>

    <!-- Modal de Detalhes -->
    <DialogRoot v-model:open="modal">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-40 bg-ink/40" />
        <DialogContent
          class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-6 shadow-xl"
        >
          <div class="flex items-center justify-between gap-3">
            <DialogTitle class="text-lg font-bold text-ink">Detalhes do Estoque</DialogTitle>
            <DialogClose
              class="flex h-10 w-10 items-center justify-center rounded-btn hover:bg-surface-bg"
              aria-label="Fechar"
            >
              <i class="bi bi-x-lg" />
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Detalhes do estoque do produto selecionado.</DialogDescription>

          <template v-if="detalhe">
            <p class="mt-4 text-lg font-bold text-ink">{{ detalhe.descricao }}</p>
            <p class="text-xs text-ink-muted">
              Seção: {{ detalhe.nomeSecao || 'Geral' }} · Código: {{ detalhe.codigo }}
            </p>

            <div class="mt-4 grid grid-cols-3 gap-3 rounded-btn bg-surface-bg p-4 text-sm">
              <div>
                <p class="text-xs text-ink-muted">Físico</p>
                <p class="font-bold" :class="(detalhe.saldoFisico ?? 0) < 0 ? 'text-red-600' : ''">
                  {{ quantidade(detalhe.saldoFisico) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-ink-muted">Reservado</p>
                <p class="font-bold">{{ quantidade(detalhe.saldoReservado) }}</p>
              </div>
              <div>
                <p class="text-xs text-ink-muted">Disponível</p>
                <p class="font-bold" :class="(detalhe.saldoDisponivel ?? 0) < 0 ? 'text-red-600' : ''">
                  {{ quantidade(detalhe.saldoDisponivel) }}
                </p>
              </div>
            </div>

            <div
              v-for="local in detalhe.locais"
              :key="local.id"
              class="mt-3 rounded-btn border border-surface-border p-3 text-sm"
            >
              <p class="font-semibold">{{ local.descricao }}</p>
              <p class="mt-1 text-xs text-ink-muted">
                Físico: {{ quantidade(local.saldoFisico) }} · Reservado: {{ quantidade(local.saldoReservado) }}
              </p>
            </div>

            <p v-if="!detalhe.locais.length" class="mt-4 text-sm text-ink-muted">
              O ERP ainda não informou saldo para este produto nos locais ativos.
            </p>
          </template>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
