/**
 * `MODELOS_VENDA`, `isVendaValida` e `flagAtivo` migraram pro backend (`../backend/src/vendas`,
 * `../backend/src/upstream/erp.constants.ts`) — `GET /vendas` já devolve só vendas válidas, e
 * os outros endpoints já devolvem boolean de verdade, não mais `"S"/"N"`. O que sobra aqui é
 * puramente apresentação (cor do badge de status na tabela de vendas), que não faz sentido
 * mover pro backend — é decisão de UI, não regra de negócio.
 */

/** Heurística para badge de status na tabela de vendas — `statusDescricao` já vem pronta do
 * backend, isto só decide a cor. */
export function statusVendaVariant(statusDescricao: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const descricao = statusDescricao.toLowerCase()
  if (descricao.includes('cancel')) return 'danger'
  if (descricao.includes('estorn')) return 'warning'
  if (!descricao) return 'neutral'
  return 'success'
}
