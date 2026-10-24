import { defineStore } from 'pinia'
import type { ColunaExport } from '@/utils/exportar'

/**
 * Registro do que está "exportável" na tela atual. Cada página que tem uma tabela principal
 * se registra aqui (via `watchEffect`, ver `VendasPage.vue` etc.) sempre que seus dados
 * mudam; o botão "Exportar" da barra de filtros globais (`FilterControls.vue`) só lê o que
 * está registrado no momento — assim ele funciona em qualquer tela sem precisar conhecer a
 * estrutura de dados de cada uma.
 */
let carregarLinhas: (() => Promise<Record<string, unknown>[]>) | null = null

export const useExportStore = defineStore('export', {
  state: () => ({
    nomeArquivo: 'picos-analytics',
    colunas: [] as ColunaExport[],
    linhas: [] as Record<string, unknown>[],
  }),
  actions: {
    registrar(nomeArquivo: string, colunas: ColunaExport[], linhas: Record<string, unknown>[], carregar?: () => Promise<Record<string, unknown>[]>) {
      this.nomeArquivo = nomeArquivo
      this.colunas = colunas
      this.linhas = linhas
      carregarLinhas = carregar ?? null
    },
    async linhasParaExportar(): Promise<Record<string, unknown>[]> {
      return carregarLinhas ? carregarLinhas() : this.linhas
    },
  },
})
