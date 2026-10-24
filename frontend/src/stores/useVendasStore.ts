import { defineStore } from 'pinia'
import { getResumoVendas, getItensVendidosPeriodo } from '@/services/dataService'
import { criarSubstituidor, eCancelamento } from '@/utils/cancelamento'
import type { ResumoVendas, ItemVendido } from '@/types'

const iniciarCarregamento = criarSubstituidor()
const iniciarCarregamentoItens = criarSubstituidor()

/**
 * Escopo de período: `documentos` (`GET /vendas`) carrega a cada troca de filtro global (via
 * `AppShell.vue`) e alimenta KPIs/gráficos em várias telas — já vem filtrado a só vendas válidas
 * pelo backend, sem precisar refiltrar aqui. `itensVendidos` (`GET /itens-vendidos`) só alimenta
 * o ranking Top Produtos da tela Produtos, então é sob demanda: `carregarItensVendidos` só é
 * chamado de lá (`onMounted` + watcher de período), não a cada troca de filtro em qualquer tela.
 *
 * O cache por intervalo já visitado vive em `services/api.ts` (por path+params), então repetir
 * o mesmo intervalo não gera nova chamada. Trocar de período no meio de um carregamento cancela
 * a busca do período anterior (via `criarSubstituidor`) em vez de deixá-la sobrescrevendo o
 * resultado mais novo — `documentos` e `itensVendidos` têm substituidores independentes, já que
 * um pode estar em voo sem o outro (nem toda tela usa Top Produtos).
 */
export const useVendasStore = defineStore('vendas', {
  state: () => ({
    resumo: null as ResumoVendas | null,
    itensVendidos: [] as ItemVendido[],
    carregando: false,
    carregado: false,
    revisao: 0,
    erro: null as string | null,
    carregandoItensVendidos: false,
    erroItensVendidos: null as string | null,
  }),
  getters: {
    idsCaixa: (state) => state.resumo?.idsCaixa ?? [],
  },
  actions: {
    async carregarPeriodo(inicio: string, fim: string, idsLojas = '', idCaixa = 'todos') {
      const signal = iniciarCarregamento()
      this.carregando = true
      this.resumo = null
      this.erro = null
      try {
        const resposta = await getResumoVendas(inicio, fim, idsLojas, idCaixa, signal)
        if (signal.aborted) return
        this.resumo = resposta
        this.carregado = true
        this.carregando = false
      } catch (e) {
        // Cancelado = um período mais novo já assumiu — a chamada mais recente é dona do
        // estado a partir daqui, então esta simplesmente para sem mexer em mais nada.
        if (signal.aborted || eCancelamento(e)) return
        this.erro = e instanceof Error ? e.message : 'Erro ao carregar vendas do período.'
        this.carregando = false
      }
    },
    /** Chamado só pela tela Produtos (onMounted + watcher de período) — não roda em toda troca de filtro. */
    async carregarItensVendidos(inicio: string, fim: string, idsLojas = '') {
      const signal = iniciarCarregamentoItens()
      this.carregandoItensVendidos = true
      this.erroItensVendidos = null
      try {
        const resposta = await getItensVendidosPeriodo(inicio, fim, signal, idsLojas)
        if (signal.aborted) return
        this.itensVendidos = resposta
        this.carregandoItensVendidos = false
      } catch (e) {
        if (signal.aborted || eCancelamento(e)) return
        this.itensVendidos = []
        this.erroItensVendidos = e instanceof Error ? e.message : 'Erro ao carregar itens vendidos do período.'
        this.carregandoItensVendidos = false
      }
    },
  },
})
