import { defineStore } from 'pinia'
import { apiGet, apiPost, apiPut } from '@/services/api'
import type { Loja } from '@/types'

export interface Franqueado {
  id: string
  email: string
  nome: string
  perfil: string
  ativo: boolean
  lojas: Loja[]
}

export const useLojasStore = defineStore('lojas', {
  state: () => ({
    lojas: [] as Loja[],
    franqueados: [] as Franqueado[],
    carregando: false,
    carregandoFranqueados: false,
    erro: null as string | null,
    erroFranqueados: null as string | null,
  }),
  actions: {
    async carregarLojas() {
      this.carregando = true
      this.erro = null
      try {
        this.lojas = await apiGet<Loja[]>('/lojas')
      } catch (e) {
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar lojas'
      } finally {
        this.carregando = false
      }
    },

    async cadastrarLoja(dados: {
      nome: string
      codigo: string
      cnpj?: string
      cidade?: string
      uf?: string
      erpToken?: string
      idEmpresaErp?: number
    }) {
      const novaLoja = await apiPost<Loja>('/lojas', dados)
      const jaExiste = this.lojas.some((l) => l.id === novaLoja.id)
      if (!jaExiste) {
        this.lojas.push(novaLoja)
      }
      return novaLoja
    },

    async carregarFranqueados() {
      this.carregandoFranqueados = true
      this.erroFranqueados = null
      try {
        this.franqueados = await apiGet<Franqueado[]>('/lojas/franqueados')
      } catch (e) {
        this.erroFranqueados = e instanceof Error ? e.message : 'Erro ao carregar franqueados'
      } finally {
        this.carregandoFranqueados = false
      }
    },

    async cadastrarFranqueado(dados: {
      email: string
      senha: string
      nome: string
      lojaIds?: string[]
    }) {
      const novo = await apiPost<Franqueado>('/lojas/franqueados', dados)
      this.franqueados.push(novo)
      return novo
    },

    async vincularLojas(idUsuario: string, lojaIds: string[]) {
      const atualizado = await apiPut<Franqueado>(`/lojas/franqueados/${idUsuario}/lojas`, { lojaIds })
      const idx = this.franqueados.findIndex((f) => f.id === idUsuario)
      if (idx >= 0) {
        this.franqueados[idx] = atualizado
      }
      return atualizado
    },
  },
})
