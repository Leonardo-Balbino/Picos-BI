<script setup lang="ts">
import { useRouter } from 'vue-router'
import PageHeader from '@/components/layout/PageHeader.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useEmpresaStore } from '@/stores/useEmpresaStore'

const auth = useAuthStore()
const empresa = useEmpresaStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <PageHeader title="Configurações" subtitle="Dados de perfil e da organização (somente leitura)." />

    <div class="space-y-6">
      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Perfil</p>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img
              v-if="auth.usuario?.foto"
              :src="auth.usuario.foto"
              :alt="auth.usuario.nome"
              class="h-14 w-14 rounded-full object-cover"
              referrerpolicy="no-referrer"
            />
            <span v-else class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
              {{ auth.usuario?.nome?.slice(0, 2).toUpperCase() }}
            </span>
            <div>
              <p class="text-lg font-bold text-ink">{{ auth.usuario?.nome }}</p>
              <p class="text-sm text-ink-muted">{{ auth.usuario?.email }}</p>
              <StatusBadge variant="success" class="mt-1">
                <i class="bi bi-patch-check-fill" /> Conta Google vinculada
              </StatusBadge>
            </div>
          </div>
          <BaseButton variant="danger-ghost" @click="handleLogout">Sair</BaseButton>
        </div>
      </div>

      <div class="rounded-card bg-surface p-5 shadow-sm">
        <p class="mb-4 border-b border-surface-border pb-3 text-sm font-semibold text-ink">Organização</p>
        <div v-if="empresa.carregando" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SkeletonCard variant="list" :rows="2" />
          <SkeletonCard variant="list" :rows="2" />
        </div>
        <p v-else-if="empresa.erro" class="text-sm text-danger-700">{{ empresa.erro }}</p>
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span class="text-xs font-medium text-ink-muted">Nome Fantasia</span>
            <p class="text-sm text-ink">{{ empresa.dados?.fantasia || '—' }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-ink-muted">Razão Social</span>
            <p class="text-sm text-ink">{{ empresa.dados?.razaoSocial || '—' }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-ink-muted">CNPJ/CPF</span>
            <p class="tabular-nums text-sm text-ink">{{ empresa.dados?.cnpjCpf || '—' }}</p>
          </div>
          <div>
            <span class="text-xs font-medium text-ink-muted">Cidade/UF</span>
            <p class="text-sm text-ink">{{ [empresa.dados?.municipio, empresa.dados?.uf].filter(Boolean).join('/') || '—' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
