/** A lista de custo é irmã de documentoMercadoria. Ausência não equivale a custo zero. */
export function mapCustoVenda(lista: unknown): number | null {
  if (!Array.isArray(lista) || !lista.length) return null
  let total = 0
  for (const wrapper of lista) {
    if (!wrapper || typeof wrapper !== 'object') return null
    const { documentoMercadoria: item, documentoMercadoriaCustoLista: custos } = wrapper
    if (!item || !Array.isArray(custos) || custos.length !== 1) return null
    const qtd = item.qtd
    const unitario = custos[0]?.valCusto
    if (typeof qtd !== 'number' || !Number.isFinite(qtd) || qtd < 0 ||
        typeof unitario !== 'number' || !Number.isFinite(unitario) || unitario < 0) return null
    total += qtd * unitario
  }
  return Math.round((total + Number.EPSILON) * 100) / 100
}
