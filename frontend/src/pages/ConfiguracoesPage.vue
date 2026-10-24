<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEmpresaStore } from '@/stores/useEmpresaStore'
import { useLojasStore, type Franqueado } from '@/stores/useLojasStore'
import { useUiStore } from '@/stores/useUiStore'

const auth = useAuthStore()
const empresa = useEmpresaStore()
const lojasStore = useLojasStore()
const ui = useUiStore()
const router = useRouter()

// Estados para criação de loja
const abrindoNovaLoja = ref(false)
const salvandoLoja = ref(false)
const novaLoja = ref({
  nome: '',
  codigo: '',
  cnpj: '',
  cidade: '',
  uf: '',
  erpToken: '',
})

// Estados para criação de franqueado
const abrindoNovoFranqueado = ref(false)
const salvandoFranqueado = ref(false)
const novoFranqueado = ref({
  nome: '',
  email: '',
  senha: '',
  lojaIds: [] as string[],
})

// Estados para edição de vínculos
const franqueadoEmEdicao = ref<Franqueado | null>(null)
const lojasVinculadasEdicao = ref<string[]>([])
const salvandoVinculo = ref(false)

onMounted(async () => {
  await lojasStore.carregarLojas()
  if (auth.isMatrizAdmin) {
    await lojasStore.carregarFranqueados()
  }
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}

async function handleSalvarLoja() {
  if (!novaLoja.value.nome || !novaLoja.value.codigo) {
    ui.toast({ title: 'Atenção', description: 'Preencha o nome e o código da unidade.', variant: 'error' })
    return
  }
  salvandoLoja.value = true
  try {
    await lojasStore.cadastrarLoja({
      nome: novaLoja.value.nome,
      codigo: novaLoja.value.codigo,
      cnpj: novaLoja.value.cnpj || undefined,
      cidade: novaLoja.value.cidade || undefined,
      uf: novaLoja.value.uf || undefined,
      erpToken: novaLoja.value.erpToken || undefined,
    })
    ui.toast({ title: 'Sucesso', description: 'Nova unidade cadastrada com sucesso!', variant: 'success' })
    abrindoNovaLoja.value = false
    novaLoja.value = { nome: '', codigo: '', cnpj: '', cidade: '', uf: '', erpToken: '' }
  } catch (e) {
    ui.toast({ title: 'Erro ao cadastrar unidade', description: e instanceof Error ? e.message : 'Falha na requisição.', variant: 'error' })
  } finally {
    salvandoLoja.value = false
  }
}

async function handleSalvarFranqueado() {
  if (!novoFranqueado.value.nome || !novoFranqueado.value.email || !novoFranqueado.value.senha) {
    ui.toast({ title: 'Atenção', description: 'Preencha nome, e-mail e senha de acesso.', variant: 'error' })
    return
  }
  salvandoFranqueado.value = true
  try {
    await lojasStore.cadastrarFranqueado({
      nome: novoFranqueado.value.nome,
      email: novoFranqueado.value.email,
      senha: novoFranqueado.value.senha,
      lojaIds: novoFranqueado.value.lojaIds,
    })
    ui.toast({ title: 'Sucesso', description: 'Usuário da empresa cadastrado com sucesso!', variant: 'success' })
    abrindoNovoFranqueado.value = false
    novoFranqueado.value = { nome: '', email: '', senha: '', lojaIds: [] }
  } catch (e) {
    ui.toast({ title: 'Erro ao cadastrar usuário', description: e instanceof Error ? e.message : 'Falha na requisição.', variant: 'error' })
  } finally {
    salvandoFranqueado.value = false
  }
}

function iniciarEdicaoVinculo(franqueado: Franqueado) {
  franqueadoEmEdicao.value = franqueado
  lojasVinculadasEdicao.value = franqueado.lojas.map((l) => l.id)
}

function toggleVinculoLoja(idLoja: string) {
  const idx = lojasVinculadasEdicao.value.indexOf(idLoja)
  if (idx >= 0) {
    lojasVinculadasEdicao.value.splice(idx, 1)
  } else {
    lojasVinculadasEdicao.value.push(idLoja)
  }
}

async function handleSalvarVinculo() {
  if (!franqueadoEmEdicao.value) return
  salvandoVinculo.value = true
  try {
    await lojasStore.vincularLojas(franqueadoEmEdicao.value.id, lojasVinculadasEdicao.value)
    ui.toast({ title: 'Sucesso', description: 'Vínculos de lojas atualizados!', variant: 'success' })
    franqueadoEmEdicao.value = null
  } catch (e) {
    ui.toast({ title: 'Erro ao atualizar vínculos', description: e instanceof Error ? e.message : 'Falha na requisição.', variant: 'error' })
  } finally {
    salvandoVinculo.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <PageHeader title="Configurações" subtitle="Dados de perfil, empresas independentes e permissões de acesso." />

    <!-- Card de Perfil -->
    <div class="rounded-card bg-surface p-5 shadow-sm border border-surface-border">
      <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Perfil do Usuário</p>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <span class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {{ auth.usuario?.nome?.slice(0, 2).toUpperCase() }}
          </span>
          <div>
            <p class="text-lg font-bold text-ink">{{ auth.usuario?.nome }}</p>
            <p class="text-sm text-ink-muted">{{ auth.usuario?.email }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge :variant="auth.isMatrizAdmin ? 'success' : 'neutral'">
                <i :class="auth.isMatrizAdmin ? 'bi bi-shield-lock-fill' : 'bi bi-shop'" class="mr-1" />
                {{ auth.isMatrizAdmin ? 'Administrador do BI' : 'Acesso da empresa' }}
              </StatusBadge>
              <span class="text-xs text-ink-muted">
                {{ auth.isMatrizAdmin ? 'Gestão das empresas cadastradas no BI' : `${auth.lojasAutorizadas.length} loja(s) autorizada(s)` }}
              </span>
            </div>
          </div>
        </div>
        <BaseButton variant="danger-ghost" @click="handleLogout">Sair da Conta</BaseButton>
      </div>
    </div>

    <!-- Gestão de Unidades Multiloja (Apenas Matriz) -->
    <div v-if="auth.isMatrizAdmin" class="rounded-card bg-surface p-5 shadow-sm border border-surface-border">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div>
          <h3 class="text-sm font-semibold text-ink">Empresas e unidades cadastradas</h3>
          <p class="text-xs text-ink-muted">Cada empresa possui dados e acessos próprios.</p>
        </div>
        <BaseButton
          variant="primary"
          class="text-xs"
          @click="abrindoNovaLoja = !abrindoNovaLoja"
        >
          <i class="bi bi-plus-lg mr-1" /> {{ abrindoNovaLoja ? 'Fechar Formulário' : 'Nova Loja' }}
        </BaseButton>
      </div>

      <!-- Formulário Nova Loja -->
      <div v-if="abrindoNovaLoja" class="mb-5 rounded-card border border-brand-200 bg-brand-50/40 p-4">
        <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-brand-900">Cadastrar Nova Unidade</h4>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label class="text-xs font-medium text-ink-muted">Nome da Loja</label>
            <input
              v-model="novaLoja.nome"
              type="text"
              placeholder="Ex: Açaí Senses - Teresina Shopping"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">Código Identificador (Slug)</label>
            <input
              v-model="novaLoja.codigo"
              type="text"
              placeholder="Ex: teresina-shopping"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">CNPJ</label>
            <input
              v-model="novaLoja.cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">Cidade</label>
            <input
              v-model="novaLoja.cidade"
              type="text"
              placeholder="Ex: Teresina"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">UF</label>
            <input
              v-model="novaLoja.uf"
              type="text"
              placeholder="PI"
              maxlength="2"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none uppercase"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">ERP Token (Opcional p/ Ingestão Direta)</label>
            <input
              v-model="novaLoja.erpToken"
              type="password"
              placeholder="Token de API do ERP desta loja"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <BaseButton variant="secondary" class="text-xs" @click="abrindoNovaLoja = false">Cancelar</BaseButton>
          <BaseButton variant="primary" class="text-xs" :loading="salvandoLoja" @click="handleSalvarLoja">
            Salvar Unidade
          </BaseButton>
        </div>
      </div>

      <!-- Tabela de Lojas -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-surface-border bg-surface-bg text-ink-muted font-semibold">
            <tr>
              <th class="p-2.5">Nome da Unidade</th>
              <th class="p-2.5">Código</th>
              <th class="p-2.5">Cidade / UF</th>
              <th class="p-2.5">CNPJ</th>
              <th class="p-2.5">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-border">
            <tr v-for="loja in lojasStore.lojas" :key="loja.id" class="hover:bg-surface-bg/50">
              <td class="p-2.5 font-bold text-ink">
                <i class="bi bi-shop mr-1.5 text-brand-600" />
                {{ loja.nome }}
              </td>
              <td class="p-2.5 font-mono text-[11px] text-ink-muted">{{ loja.codigo }}</td>
              <td class="p-2.5 text-ink">{{ [loja.cidade, loja.uf].filter(Boolean).join(' / ') || '—' }}</td>
              <td class="p-2.5 font-mono text-[11px] text-ink-muted">{{ loja.cnpj || '—' }}</td>
              <td class="p-2.5">
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <i class="bi bi-check-circle-fill" /> Ativa
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Gestão de Franqueados e Permissões RLS (Apenas Matriz) -->
    <div v-if="auth.isMatrizAdmin" class="rounded-card bg-surface p-5 shadow-sm border border-surface-border">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-3">
        <div>
          <h3 class="text-sm font-semibold text-ink">Usuários e permissões de acesso</h3>
          <p class="text-xs text-ink-muted">Controle quais unidades cada usuário pode visualizar nos dashboards.</p>
        </div>
        <BaseButton
          variant="primary"
          class="text-xs"
          @click="abrindoNovoFranqueado = !abrindoNovoFranqueado"
        >
          <i class="bi bi-person-plus mr-1" /> {{ abrindoNovoFranqueado ? 'Fechar Formulário' : 'Novo Usuário' }}
        </BaseButton>
      </div>

      <!-- Formulário Novo Usuário -->
      <div v-if="abrindoNovoFranqueado" class="mb-5 rounded-card border border-brand-200 bg-brand-50/40 p-4">
        <h4 class="mb-3 text-xs font-bold uppercase tracking-wider text-brand-900">Cadastrar Novo Usuário</h4>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label class="text-xs font-medium text-ink-muted">Nome do Usuário</label>
            <input
              v-model="novoFranqueado.nome"
              type="text"
              placeholder="Ex: Fernando Souza"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">E-mail de Login</label>
            <input
              v-model="novoFranqueado.email"
              type="email"
              placeholder="usuario@empresa.com"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="text-xs font-medium text-ink-muted">Senha Inicial</label>
            <input
              v-model="novoFranqueado.senha"
              type="password"
              placeholder="Mínimo 6 caracteres"
              class="mt-1 w-full rounded-btn border border-surface-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div class="mt-3">
          <label class="text-xs font-medium text-ink-muted">Lojas Autorizadas (RLS)</label>
          <div class="mt-1.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <label
              v-for="loja in lojasStore.lojas"
              :key="loja.id"
              class="flex items-center gap-2 rounded-btn border border-surface-border bg-surface p-2 text-xs cursor-pointer hover:bg-surface-bg"
            >
              <input
                type="checkbox"
                class="rounded text-brand-600 focus:ring-brand-500"
                :value="loja.id"
                v-model="novoFranqueado.lojaIds"
              />
              <span class="truncate font-medium text-ink">{{ loja.nome }}</span>
            </label>
          </div>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <BaseButton variant="secondary" class="text-xs" @click="abrindoNovoFranqueado = false">Cancelar</BaseButton>
          <BaseButton variant="primary" class="text-xs" :loading="salvandoFranqueado" @click="handleSalvarFranqueado">
            Cadastrar Usuário
          </BaseButton>
        </div>
      </div>

      <!-- Tabela de Franqueados -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-surface-border bg-surface-bg text-ink-muted font-semibold">
            <tr>
              <th class="p-2.5">Nome do Usuário</th>
              <th class="p-2.5">E-mail</th>
              <th class="p-2.5">Lojas Autorizadas</th>
              <th class="p-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-border">
            <tr v-for="franq in lojasStore.franqueados" :key="franq.id" class="hover:bg-surface-bg/50">
              <td class="p-2.5 font-bold text-ink">
                <i class="bi bi-person-badge mr-1.5 text-brand-600" />
                {{ franq.nome }}
              </td>
              <td class="p-2.5 text-ink-muted">{{ franq.email }}</td>
              <td class="p-2.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="l in franq.lojas"
                    :key="l.id"
                    class="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800"
                  >
                    {{ l.nome }}
                  </span>
                  <span v-if="franq.lojas.length === 0" class="text-xs text-ink-muted italic">
                    Nenhuma loja vinculada
                  </span>
                </div>
              </td>
              <td class="p-2.5 text-right">
                <BaseButton
                  variant="secondary"
                  class="text-xs text-brand-600 hover:text-brand-800"
                  @click="iniciarEdicaoVinculo(franq)"
                >
                  <i class="bi bi-gear mr-1" /> Editar Vínculos
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Modal de Edição de Vínculo de Lojas -->
      <div
        v-if="franqueadoEmEdicao"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      >
        <div class="w-full max-w-md rounded-card border border-surface-border bg-surface p-5 shadow-2xl">
          <h4 class="text-sm font-bold text-ink mb-1">
            Vincular Lojas para {{ franqueadoEmEdicao.nome }}
          </h4>
          <p class="text-xs text-ink-muted mb-4">
            Selecione as unidades que este usuário terá permissão para visualizar.
          </p>

          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            <label
              v-for="loja in lojasStore.lojas"
              :key="loja.id"
              class="flex items-center justify-between rounded-btn border border-surface-border p-2 text-xs cursor-pointer hover:bg-surface-bg"
              :class="lojasVinculadasEdicao.includes(loja.id) ? 'bg-brand-50 border-brand-300 font-semibold' : ''"
            >
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="rounded text-brand-600 focus:ring-brand-500"
                  :checked="lojasVinculadasEdicao.includes(loja.id)"
                  @change="toggleVinculoLoja(loja.id)"
                />
                <span>{{ loja.nome }}</span>
              </div>
              <span class="text-[10px] text-ink-muted">{{ loja.cidade }}/{{ loja.uf }}</span>
            </label>
          </div>

          <div class="mt-5 flex justify-end gap-2 border-t border-surface-border pt-3">
            <BaseButton variant="secondary" class="text-xs" @click="franqueadoEmEdicao = null">Cancelar</BaseButton>
            <BaseButton variant="primary" class="text-xs" :loading="salvandoVinculo" @click="handleSalvarVinculo">
              Salvar Alterações
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Informações da Organização -->
    <div v-if="!auth.isMatrizAdmin" class="rounded-card bg-surface p-5 shadow-sm border border-surface-border">
      <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Dados da empresa</p>
      <div v-if="empresa.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SkeletonCard variant="list" :rows="2" />
        <SkeletonCard variant="list" :rows="2" />
      </div>
      <p v-else-if="empresa.erro" class="text-sm text-danger-700">{{ empresa.erro }}</p>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span class="text-xs font-medium text-ink-muted">Nome Fantasia</span>
          <p class="text-sm text-ink font-semibold">{{ empresa.dados?.fantasia || '—' }}</p>
        </div>
        <div>
          <span class="text-xs font-medium text-ink-muted">Razão Social</span>
          <p class="text-sm text-ink font-semibold">{{ empresa.dados?.razaoSocial || '—' }}</p>
        </div>
        <div>
          <span class="text-xs font-medium text-ink-muted">CNPJ/CPF</span>
          <p class="tabular-nums text-sm text-ink font-mono">{{ empresa.dados?.cnpjCpf || '—' }}</p>
        </div>
        <div>
          <span class="text-xs font-medium text-ink-muted">Cidade/UF</span>
          <p class="text-sm text-ink">{{ [empresa.dados?.municipio, empresa.dados?.uf].filter(Boolean).join('/') || '—' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
