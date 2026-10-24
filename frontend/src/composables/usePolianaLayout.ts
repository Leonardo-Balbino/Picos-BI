import { computed } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useFiltersStore } from '@/stores/useFiltersStore'
import { useLojasStore } from '@/stores/useLojasStore'

const POLIANA_ID = 'ca1a1a30-3666-4c0f-9b68-888675b91494'
const YASMIN_ID = 'c8e54736-419b-4682-8bc1-6cb9d24a0d92'

function isLojaAtiva(
  idAlvo: string,
  codigoAlvo: string,
  auth: ReturnType<typeof useAuthStore>,
  filters: ReturnType<typeof useFiltersStore>,
  lojas: ReturnType<typeof useLojasStore>,
): boolean {
  const permitidas = auth.lojasAutorizadas
  const selecionadas = filters.lojasSelecionadas

  // Usuário franqueado vinculado exclusivamente a essa loja ou email correspondente
  if (!auth.isMatrizAdmin) {
    if (permitidas.length === 1 && permitidas[0] === idAlvo) return true
    if (auth.usuario?.email?.toLowerCase().includes(codigoAlvo.toLowerCase())) return true
    const lojaPermitida = lojas.lojas.find(l => permitidas.includes(l.id))
    if (lojaPermitida?.codigo?.toLowerCase() === codigoAlvo.toLowerCase()) return true
  }

  // Admin ou multi-loja: avalia o escopo selecionado no filtro
  const disponiveis = auth.isMatrizAdmin ? lojas.lojas.map(l => l.id) : permitidas
  const escopo = selecionadas.length
    ? selecionadas.filter(id => auth.isMatrizAdmin || permitidas.includes(id))
    : disponiveis

  if (escopo.length === 1) {
    if (escopo[0] === idAlvo) return true
    const lojaEscopo = lojas.lojas.find(l => l.id === escopo[0])
    if (lojaEscopo?.codigo?.toLowerCase() === codigoAlvo.toLowerCase()) return true
  }

  return false
}

/** Personalização visual por empresa; as permissões continuam sendo validadas pelo backend. */
export function usePolianaLayout() {
  const auth = useAuthStore()
  const filters = useFiltersStore()
  const lojas = useLojasStore()

  const somentePoliana = computed(() => isLojaAtiva(POLIANA_ID, 'poliana', auth, filters, lojas))
  const somenteYasmin = computed(() => isLojaAtiva(YASMIN_ID, 'yasmin', auth, filters, lojas))

  return {
    somentePoliana,
    somenteYasmin,
  }
}
