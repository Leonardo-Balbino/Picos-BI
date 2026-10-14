import { defineStore } from 'pinia'
import { getVendasPeriodo, getItensVendidosPeriodo } from '@/services/dataService'
import { isVendaValida } from '@/services/apiConstants'
import { criarSubstituidor, eCancelamento } from '@/utils/cancelamento'
import type { Venda, ItemVendido } from '@/types'

const iniciarCarregamento = criarSubstituidor()
const iniciarCarregamentoItens = criarSubstituidor()

/**
 * Escopo de período: `documentos` (`documento/v1`) carrega a cada troca de filtro global (via
 * `AppShell.vue`) e alimenta KPIs/gráficos em várias telas. `itensVendidos`
 * (`mercadorias-vendidas/v1`, 2 chamadas — uma por modelo de venda) só alimenta o ranking Top
 * Produtos da tela Produtos, então é sob demanda: `carregarItensVendidos` só é chamado de lá
 * (`onMounted` + watcher de período), não a cada troca de filtro em qualquer tela.
 *
 * O cache por intervalo já visitado vive em `services/api.ts` (por path+params), então repetir
 * o mesmo intervalo não gera nova chamada. Trocar de período no meio de um carregamento cancela
 * a busca do período anterior (via `criarSubstituidor`) em vez de deixá-la drenando a fila
 * atrás da busca nova — `documentos` e `itensVendidos` têm substituidores independentes, já que
 * um pode estar em voo sem o outro (nem toda tela usa Top Produtos).
 */
export const useVendasStore = defineStore('vendas', {
  state: () => ({
    documentos: [] as Venda[],
    itensVendidos: [] as ItemVendido[],
    carregando: false,
    carregado: false,
    progresso: { pagina: 0, totalPaginas: 0 },
    erro: null as string | null,
    carregandoItensVendidos: false,
    erroItensVendidos: null as string | null,
  }),
  getters: {
    documentosValidos: (state) => state.documentos.filter(isVendaValida),
    idsCaixa: (state) => Array.from(new Set(state.documentos.map((d) => d.idCaixa))).sort(),
  },
  actions: {
    async carregarPeriodo(inicio: string, fim: string) {
      const signal = iniciarCarregamento()
      this.carregando = true
      this.erro = null
      this.progresso = { pagina: 0, totalPaginas: 0 }
      try {
        this.documentos = await getVendasPeriodo(
          inicio,
          fim,
          (pagina, totalPaginas) => {
            this.progresso = { pagina, totalPaginas }
          },
          signal,
        )
        this.carregado = true
        this.carregando = false
      } catch (e) {
        // Cancelado = um período mais novo já assumiu — a chamada mais recente é dona do
        // estado a partir daqui, então esta simplesmente para sem mexer em mais nada.
        if (eCancelamento(e)) return
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar vendas do período.'
        this.carregando = false
      }
    },
    /** Chamado só pela tela Produtos (onMounted + watcher de período) — não roda em toda troca de filtro. */
    async carregarItensVendidos(inicio: string, fim: string) {
      const signal = iniciarCarregamentoItens()
      this.carregandoItensVendidos = true
      this.erroItensVendidos = null
      try {
        this.itensVendidos = await getItensVendidosPeriodo(inicio, fim, signal)
        this.carregandoItensVendidos = false
      } catch (e) {
        if (eCancelamento(e)) return
        this.itensVendidos = []
        this.erroItensVendidos = e instanceof Error ? e.message : 'Erro ao carregar itens vendidos do período.'
        this.carregandoItensVendidos = false
      }
    },
  },
})
