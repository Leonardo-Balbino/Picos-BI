<script setup lang="ts">
import { defineAsyncComponent, computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import PageHeader from '@/components/layout/PageHeader.vue'
import StoreFilter from '@/components/filters/StoreFilter.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import KpiCard from '@/components/ui/KpiCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DataTable, { type DataTableColumn } from '@/components/ui/DataTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { getClientesReceber, getParcelasClienteReceber, getContaReceber, type ClienteReceberItem, type ParcelasClienteReceber, type ContaReceberItem, type ContaReceberDetalhe, type PaginaClientesReceber } from '@/services/operacionalService'
import { getPainelContasReceber, type PainelContasResultado } from '@/services/dataService'
import { formatCurrency, formatNumber } from '@/utils/formatters'
import { type QueryParams } from '@/services/api'

const DebitosClienteDialog = defineAsyncComponent(() => import('@/components/recebiveis/DebitosClienteDialog.vue'))
const filters = useFiltersStore()
const dados = ref<PaginaClientesReceber | null>(null)
const painelReceber = ref<PainelContasResultado | null>(null)
const carregando = ref(false)
const erro = ref('')
const page = ref(1)
const pageSize = 20
const ordenar = ref('vencimento')
const filtroAplicado = ref<QueryParams>({})
let pedido = 0
let timer: ReturnType<typeof setInterval> | undefined
function dia(valor: string | null) {
  if (!valor) return '—'
  const [ano, mes, data] = valor.slice(0, 10).split('-')
  return data + '/' + mes + '/' + ano
}
const labelSituacao = (valor: string) => ({ VENCIDA: 'Vencida', HOJE: 'Vence hoje', A_VENCER: 'A vencer' }[valor] || valor)
async function carregar(silencioso = false) {
  const atual = ++pedido
  if (!silencioso) carregando.value = true
  erro.value = ''
  try {
    const idLoja = filters.lojasSelecionadas.length === 1 ? filters.lojasSelecionadas[0] : undefined
    const [resposta, painelRes] = await Promise.all([
      getClientesReceber({ ...filtroAplicado.value, page: page.value, pageSize, idsLojas: filters.lojasSelecionadas.slice().sort().join(',') }),
      getPainelContasReceber(undefined, undefined, idLoja).catch(() => null),
    ])
    if (atual !== pedido) return
    if (page.value > 1 && resposta.total <= (page.value - 1) * pageSize) { page.value = Math.max(1, Math.ceil(resposta.total / pageSize)); return }
    dados.value = resposta
    if (painelRes) painelReceber.value = painelRes
  } catch (e) {
    if (atual === pedido) erro.value = e instanceof Error ? e.message : 'Não foi possível consultar as contas.'
  } finally { if (atual === pedido) carregando.value = false }
}
function aplicar() {
  modal.value = false
  filtroAplicado.value = { ordenar: ordenar.value }
  if (page.value !== 1) page.value = 1
  else void carregar()
}
function limpar() {
  ordenar.value = 'vencimento'
  aplicar()
}
watch(page, () => { void carregar() })
watch(() => filters.lojasSelecionadas.join(','), () => {
  modal.value = false; dados.value = null; pedidoDetalhe++; pedidoParcelas++; grupo.value = null; parcelas.value = null
  if (page.value !== 1) page.value = 1
  else void carregar()
})
const modal = ref(false)
const modalImpressao = ref(false)
const queryImpressao = computed(() => ({ ...filtroAplicado.value, idsLojas: filters.lojasSelecionadas.slice().sort().join(',') }))
const detalhe = ref<ContaReceberDetalhe | null>(null)
const erroDetalhe = ref('')
const carregandoDetalhe = ref(false)
let pedidoDetalhe = 0
const grupo = ref<ClienteReceberItem | null>(null)
const parcelas = ref<ParcelasClienteReceber | null>(null)
const paginaParcelas = ref(1)
const carregandoParcelas = ref(false)
const erroParcelas = ref('')
let pedidoParcelas = 0
async function carregarParcelas(silencioso = false) {
  if (!grupo.value) return
  const atual = ++pedidoParcelas
  if (!silencioso) carregandoParcelas.value = true
  erroParcelas.value = ''
  try {
    const r = await getParcelasClienteReceber(grupo.value.id, { ...filtroAplicado.value,
      idsLojas: filters.lojasSelecionadas.slice().sort().join(','), page: paginaParcelas.value, pageSize: 10 })
    if (atual !== pedidoParcelas) return
    if (paginaParcelas.value > 1 && r.total <= (paginaParcelas.value-1)*10) {
      paginaParcelas.value = Math.max(1,Math.ceil(r.total/10)); return
    }
    parcelas.value = r
  } catch (e) { if (atual === pedidoParcelas) erroParcelas.value = e instanceof Error ? e.message : 'Não foi possível carregar as parcelas.' }
  finally { if (atual === pedidoParcelas) carregandoParcelas.value = false }
}
async function abrir(cliente: ClienteReceberItem) {
  pedidoDetalhe++; detalhe.value = null; erroDetalhe.value = ''; carregandoDetalhe.value = false
  grupo.value = cliente; parcelas.value = null; modal.value = true
  if (paginaParcelas.value !== 1) paginaParcelas.value = 1
  else await carregarParcelas()
}
watch(paginaParcelas, () => { if (modal.value) void carregarParcelas() })
watch(modal, aberto => { if (!aberto) { modalImpressao.value = false; pedidoParcelas++; pedidoDetalhe++; grupo.value = null; parcelas.value = null; detalhe.value = null } })
async function abrirParcela(conta: ContaReceberItem) {
  const atual = ++pedidoDetalhe
  detalhe.value = null; erroDetalhe.value = ''; carregandoDetalhe.value = true
  try { const r = await getContaReceber(conta.id); if (atual === pedidoDetalhe) detalhe.value = r }
  catch (e) { if (atual === pedidoDetalhe) erroDetalhe.value = e instanceof Error ? e.message : 'Não foi possível carregar a conta.' }
  finally { if (atual === pedidoDetalhe) carregandoDetalhe.value = false }
}
function voltarParcelas() { pedidoDetalhe++; detalhe.value = null; erroDetalhe.value = ''; carregandoDetalhe.value = false }
const columnsParcelas: DataTableColumn[] = [
  { key: 'numero', label: 'Documento' }, { key: 'dtVencimento', label: 'Vencimento' },
  { key: 'valOrigem', label: 'Original', align: 'right' }, { key: 'valPago', label: 'Pago', align: 'right' },
  { key: 'valSaldo', label: 'Em aberto', align: 'right' }, { key: 'situacao', label: 'Situação' }, { key: 'acao', label: 'Detalhes' },
]
const resumo = computed(() => dados.value?.resumo)
const kpisPainel = computed(() => painelReceber.value?.kpis)

const categoriasFluxo = computed(() => {
  if (!painelReceber.value?.fluxo) return []
  return painelReceber.value.fluxo.map((f) => {
    const parts = f.data.split('-')
    if (parts.length === 2) {
      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      const mesNum = parseInt(parts[1], 10) - 1
      return `${meses[mesNum] ?? parts[1]}/${parts[0].slice(2)}`
    }
    return f.data
  })
})

const seriesFluxo = computed(() => {
  if (!painelReceber.value?.fluxo) return []
  return [
    { name: 'Em Aberto', data: painelReceber.value.fluxo.map((f) => f.aberto) },
    { name: 'Vencido', data: painelReceber.value.fluxo.map((f) => f.vencido) },
    { name: 'Recebido / Liquidado', data: painelReceber.value.fluxo.map((f) => f.liquidado) },
  ]
})

const columns: DataTableColumn[] = [
  { key: 'nome', label: 'Cliente' }, { key: 'parcelas', label: 'Parcelas' },
  { key: 'primeiroVencimento', label: '1º Venc' }, { key: 'saldoAberto', label: 'Total', align: 'right' },
  { key: 'saldoVencido', label: 'V. Venc', align: 'right' }, { key: 'acao', label: 'Parcelas' },
]
function verificar() {
  if (!document.hidden && !carregando.value) {
    void carregar(true)
    if (modal.value && !carregandoParcelas.value && !detalhe.value && !carregandoDetalhe.value) void carregarParcelas(true)
  }
}
onMounted(() => { void carregar(); timer = setInterval(verificar, 60_000); document.addEventListener('visibilitychange', verificar) })
onUnmounted(() => { pedido++; pedidoDetalhe++; pedidoParcelas++; if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', verificar) })
</script>
<template>
  <div>
    <PageHeader title="Contas a receber" />
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><StoreFilter /><BaseButton variant="secondary" icon="bi-arrow-clockwise" :loading="carregando" @click="carregar()">Atualizar dados</BaseButton></div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Saldo em aberto"
        :value="resumo ? formatCurrency(resumo.saldoAberto) : '—'"
        icon="bi-wallet2"
        :highlight="true"
        suffix="Total a receber em aberto"
      />
      <KpiCard
        label="Saldo vencido"
        :value="resumo ? formatCurrency(resumo.saldoVencido) : '—'"
        icon="bi-exclamation-circle"
        badge="Atenção"
        badge-variant="amber"
        :suffix="resumo ? `${formatNumber(resumo.titulosVencidos)} título(s) vencido(s)` : undefined"
      />
      <KpiCard
        label="Total Liquidado"
        :value="kpisPainel ? formatCurrency(kpisPainel.totalLiquidado) : '—'"
        icon="bi-check-circle-fill"
        badge="Recebido"
        badge-variant="green"
        :suffix="kpisPainel ? `${formatNumber(kpisPainel.quantidadeLiquidado)} título(s) baixado(s)` : undefined"
      />
      <KpiCard
        label="Clientes Devedores"
        :value="resumo ? formatNumber(resumo.clientes) : '—'"
        icon="bi-people"
        :suffix="resumo ? `${formatNumber(resumo.titulos)} título(s) pendente(s)` : undefined"
      />
    </div>

    <!-- Gráfico de Fluxo de Vencimentos de Contas a Receber -->
    <div class="mt-6 rounded-card border border-surface-border bg-surface p-5 shadow-sm">
      <div class="mb-4">
        <h2 class="text-base font-bold text-ink">Fluxo de Vencimentos a Receber</h2>
        <p class="text-xs text-ink-muted">Distribuição temporal dos recebíveis por competência de vencimento</p>
      </div>

      <div v-if="carregando && !painelReceber" class="py-12">
        <SkeletonCard variant="chart" :height="260" />
      </div>
      <EmptyState
        v-else-if="!seriesFluxo.length || seriesFluxo.every(s => s.data.every(v => v === 0))"
        icon="bi-calendar-check"
        title="Nenhum vencimento no período"
        description="Não há fluxo de contas a receber para a seleção atual."
      />
      <div v-else class="h-[280px]">
        <BarChart
          :categories="categoriasFluxo"
          :series="seriesFluxo"
          :height="260"
          :stacked="true"
          :value-formatter="formatCurrency"
        />
      </div>
    </div>
    <form class="mt-6 rounded-card border border-surface-border bg-surface p-5 shadow-sm" @submit.prevent="aplicar">
      <div class="flex flex-wrap items-end gap-3">
        <label class="w-full text-xs font-medium text-ink-muted sm:max-w-sm">Ordenar<select v-model="ordenar" class="mt-1 w-full rounded-btn border border-surface-border bg-surface-bg px-3 py-2 text-sm text-ink"><option value="vencimento">Primeiro vencimento mais antigo</option><option value="saldo">Maior total devido</option></select></label>
        <div class="flex flex-wrap items-end gap-2"><BaseButton type="submit" variant="primary">Aplicar</BaseButton><BaseButton type="button" variant="secondary" @click="limpar">Restaurar ordem</BaseButton></div>
      </div>
    </form>
    <div class="mt-6 rounded-card bg-surface p-5 shadow-sm">
      <p class="mb-4 text-sm font-semibold text-ink">Total devido por cliente</p>
      <div v-if="carregando" class="space-y-2"><SkeletonCard v-for="i in 4" :key="i" variant="table-row" /></div>
      <EmptyState v-else-if="erro" icon="bi-exclamation-triangle" title="Não foi possível atualizar as contas" :description="erro"><BaseButton variant="secondary" class="mt-3" @click="carregar()">Tentar novamente</BaseButton></EmptyState>
      <template v-else>
        <DataTable :columns="columns" :rows="dados?.items ?? []" :row-key="r => r.id" empty-title="Nenhuma dívida pendente encontrada" empty-description="Não há clientes com parcelas em aberto nesta seleção.">
          <template #cell-nome="{ row }"><button class="text-left font-semibold text-brand-700 hover:underline" @click="abrir(row)">{{ row.nome || 'Cliente não informado' }}</button></template>
          <template #cell-parcelas="{ row }">{{ row.parcelas }}<p v-if="row.parcelasVencidas" class="text-xs text-danger-700">{{ row.parcelasVencidas }} vencida(s)</p></template>
          <template #cell-primeiroVencimento="{ row }">{{ dia(row.primeiroVencimento) }}</template>
          <template #cell-saldoAberto="{ row }"><span class="font-bold">{{ formatCurrency(row.saldoAberto) }}</span></template>
          <template #cell-saldoVencido="{ row }"><span :class="row.saldoVencido > 0 ? 'text-danger-700' : 'text-ink-muted'">{{ formatCurrency(row.saldoVencido) }}</span></template>
          <template #cell-acao="{ row }"><BaseButton variant="secondary" @click="abrir(row)">Ver parcelas</BaseButton></template>
        </DataTable>
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted"><span>{{ dados?.total ?? 0 }} cliente(s) com saldo em aberto</span><Pagination v-model:page="page" :total="dados?.total ?? 0" :items-per-page="pageSize" /></div>
      </template>
    </div>
    <DialogRoot v-model:open="modal"><DialogPortal><DialogOverlay class="fixed inset-0 z-40 bg-ink/40" />
      <DialogContent class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-surface p-6 shadow-xl">
        <div class="flex items-center justify-between gap-3"><DialogTitle class="text-lg font-bold text-ink">{{ detalhe || carregandoDetalhe || erroDetalhe ? 'Detalhes da parcela' : 'Parcelas do cliente' }}</DialogTitle><DialogClose class="flex h-10 w-10 items-center justify-center rounded-btn hover:bg-surface-bg" aria-label="Fechar detalhes"><i class="bi bi-x-lg" /></DialogClose></div>
        <DialogDescription class="mt-1 text-xs text-ink-muted">Veja as parcelas com saldo em aberto deste cliente.</DialogDescription>
        <BaseButton v-if="detalhe || carregandoDetalhe || erroDetalhe" class="mt-4" variant="secondary" @click="voltarParcelas">Voltar às parcelas</BaseButton>
        <template v-if="!detalhe && !carregandoDetalhe && !erroDetalhe">
          <div class="mt-5 rounded-btn bg-brand-50 p-4">
            <p class="text-lg font-bold text-ink">{{ parcelas?.cliente.nome || grupo?.nome }}</p>
            <p v-if="parcelas?.cliente.razaoSocial && parcelas.cliente.razaoSocial !== parcelas.cliente.nome" class="text-sm text-ink-muted">{{ parcelas.cliente.razaoSocial }}</p>
            <BaseButton class="mt-3" variant="secondary" icon="bi-printer" :disabled="carregandoParcelas || !!erroParcelas || !parcelas?.total" @click="modalImpressao = true">Imprimir / compartilhar</BaseButton>
            <p class="mt-3 text-xs text-ink-muted">Total em aberto do cliente</p>
            <p class="text-2xl font-bold text-ink">{{ formatCurrency(parcelas?.saldoAberto ?? grupo?.saldoAberto ?? 0) }}</p>
          </div>
          <SkeletonCard v-if="carregandoParcelas" class="mt-4" variant="list" :rows="4" />
          <div v-else-if="erroParcelas" class="mt-4"><p role="alert" class="text-sm text-danger-700">{{ erroParcelas }}</p><BaseButton class="mt-3" variant="secondary" @click="carregarParcelas()">Tentar novamente</BaseButton></div>
          <template v-else>
            <div class="mt-5">
              <DataTable :columns="columnsParcelas" :rows="parcelas?.items ?? []" :row-key="r => r.id" empty-title="Nenhuma parcela em aberto" empty-description="As parcelas podem ter sido quitadas desde a última atualização.">
                <template #cell-numero="{ row }">{{ row.numero || row.idDocumento || '—' }}<p v-if="row.parcela" class="text-xs text-ink-muted">Parcela {{ row.parcela }}</p></template>
                <template #cell-dtVencimento="{ row }">{{ dia(row.dtVencimento) }}</template>
                <template #cell-valOrigem="{ row }">{{ formatCurrency(row.valOrigem) }}</template>
                <template #cell-valPago="{ row }">{{ formatCurrency(row.valPago) }}</template>
                <template #cell-valSaldo="{ row }"><span class="font-bold">{{ formatCurrency(row.valSaldo) }}</span></template>
                <template #cell-situacao="{ row }"><StatusBadge :variant="row.situacao === 'VENCIDA' ? 'danger' : row.situacao === 'HOJE' ? 'warning' : 'success'">{{ labelSituacao(row.situacao) }}</StatusBadge></template>
                <template #cell-acao="{ row }"><BaseButton variant="secondary" @click="abrirParcela(row)">Ver detalhes</BaseButton></template>
              </DataTable>
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted"><span>{{ parcelas?.total ?? 0 }} parcela(s) em aberto</span><Pagination v-model:page="paginaParcelas" :total="parcelas?.total ?? 0" :items-per-page="10" /></div>
          </template>
          <p class="mt-4 text-xs text-ink-muted">Pagamentos e baixas continuam sendo registrados no ERP.</p>
        </template>
        <SkeletonCard v-if="carregandoDetalhe"  class="mt-4" variant="list" :rows="4" />
        <p v-else-if="erroDetalhe" role="alert" class="mt-4 text-sm text-danger-700">{{ erroDetalhe }}</p>
        <template v-else-if="detalhe">
          <div class="mt-5 rounded-btn border border-brand-200 bg-brand-50 p-4"><p class="text-xs font-semibold uppercase text-brand-700">Cliente devedor</p><p class="mt-1 text-lg font-bold text-ink">{{ detalhe.cliente.nome || 'Cliente não informado pelo ERP' }}</p><p v-if="detalhe.cliente.razaoSocial && detalhe.cliente.razaoSocial !== detalhe.cliente.nome" class="text-sm text-ink">{{ detalhe.cliente.razaoSocial }}</p><p v-if="detalhe.cliente.cnpjCpf" class="mt-2 text-sm text-ink">CPF/CNPJ: {{ detalhe.cliente.cnpjCpf }}</p><p v-if="detalhe.cliente.telefone" class="mt-1 text-sm text-ink">Telefone: {{ detalhe.cliente.telefone }}</p><p v-if="detalhe.cliente.email" class="mt-1 break-all text-sm text-ink">E-mail: {{ detalhe.cliente.email }}</p><p v-if="!detalhe.cliente.cadastroLocalizado" class="mt-2 text-xs text-ink-muted">O ERP informou o nome na conta; os dados complementares ainda não estão disponíveis.</p></div>
          <dl class="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt class="text-xs text-ink-muted">Documento / parcela</dt><dd class="font-semibold">{{ detalhe.numero || '—' }} / {{ detalhe.parcela || '—' }}</dd></div><div><dt class="text-xs text-ink-muted">Empresa</dt><dd>{{ detalhe.nomeLoja }}</dd></div>
            <div><dt class="text-xs text-ink-muted">Lançamento</dt><dd>{{ dia(detalhe.dtLancamento) }}</dd></div><div><dt class="text-xs text-ink-muted">Vencimento</dt><dd>{{ dia(detalhe.dtVencimento) }}</dd></div>
            <div><dt class="text-xs text-ink-muted">Valor original</dt><dd>{{ formatCurrency(detalhe.valOrigem) }}</dd></div><div><dt class="text-xs text-ink-muted">Valor pago</dt><dd class="text-green-700">{{ formatCurrency(detalhe.valPago) }}</dd></div>
            <div><dt class="text-xs text-ink-muted">Desconto</dt><dd>{{ formatCurrency(detalhe.valDesconto) }}</dd></div><div><dt class="text-xs text-ink-muted">Último pagamento</dt><dd>{{ dia(detalhe.dtPagamento) }}</dd></div>
          </dl>
          <div class="mt-5 rounded-btn bg-surface-bg p-4"><p class="text-xs text-ink-muted">Saldo que o cliente ainda deve</p><p class="mt-1 text-2xl font-bold text-ink">{{ formatCurrency(detalhe.valSaldo) }}</p><p class="mt-1 text-xs text-ink-muted">{{ labelSituacao(detalhe.situacao) }}<span v-if="detalhe.parcial"> · pagamento parcial</span></p></div>
          <p v-if="detalhe.descricao" class="mt-4 whitespace-pre-wrap text-sm text-ink">{{ detalhe.descricao }}</p><p class="mt-4 text-xs text-ink-muted">Pagamentos e baixas continuam sendo registrados no ERP.</p>
        </template>
      </DialogContent>
    </DialogPortal></DialogRoot>
    <DebitosClienteDialog v-if="modalImpressao" v-model:open="modalImpressao" :cliente="grupo" :query="queryImpressao" />
  </div>
</template>
