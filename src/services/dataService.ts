import { apiGet } from './api'
import type { Venda, Produto, Categoria, Vendedor, Cliente } from '@/types'

export interface UsuarioConfig {
  organizacao: {
    nomeComercio: string
    cnpj: string
  }
  metas: {
    faturamentoMensalGlobal: number
    metaPorVendedorMedia: number
  }
  preferencias: {
    periodoPadrao: string
    moedaPadrao: string
    fusoHorario: string
    relatoriosSemanaisPorEmail: boolean
    alertasMetaAtingida: boolean
  }
}

export function getVendas() {
  return apiGet<Venda[]>('vendas')
}
export function getProdutos() {
  return apiGet<Produto[]>('produtos')
}
export function getCategorias() {
  return apiGet<Categoria[]>('categorias')
}
export function getVendedores() {
  return apiGet<Vendedor[]>('vendedores')
}
export function getClientes() {
  return apiGet<Cliente[]>('clientes')
}
export function getUsuarioConfig() {
  return apiGet<UsuarioConfig>('usuario')
}
