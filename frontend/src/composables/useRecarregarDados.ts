import { useFiltersStore } from '@/stores/useFiltersStore'
import { useVendasStore } from '@/stores/useVendasStore'
import { limparCacheApi } from '@/services/api'
import { resolverIntervalo, paraDataApi } from '@/utils/periodo'

/** Resolve o intervalo de datas do preset atual e dispara o recarregamento das vendas do período. */
export function useRecarregarDados() {
  const filters = useFiltersStore()
  const vendas = useVendasStore()

  function periodoAtualISO() {
    const intervalo = resolverIntervalo(filters.periodo, filters.range)
    return { inicio: paraDataApi(intervalo.inicio), fim: paraDataApi(intervalo.fim) }
  }

  function carregar() {
    const { inicio, fim } = periodoAtualISO()
    return vendas.carregarPeriodo(inicio, fim)
  }

  function forcarAtualizacao() {
    limparCacheApi()
    vendas.carregado = false
    return carregar()
  }

  return { periodoAtualISO, carregar, forcarAtualizacao }
}
