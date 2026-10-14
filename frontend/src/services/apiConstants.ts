/**
 * Módulo único de constantes/regras de domínio de `documento/v1`, confirmadas por
 * inspeção real da API em 2026-07-18 (913 documentos, jan-jul/2026 — ver seção 14.3 do
 * prompt de edição v2, que esta inspeção resolve).
 *
 * Modelos observados e o que cada um significa:
 * - `65` (NFC-e) e `PA` (Pedido de Venda) — vendas reais, sempre com
 *   `tipoMovimento:'S'` (Saída) + `tipoMovimentoFinanceiro:'R'` (Recebimento) + `pagamentosLista` não vazia.
 * - `PP` (Indefinido) — pedido em aberto/rascunho: `tipoMovimento:'S'` mas
 *   `tipoMovimentoFinanceiro:'N'` e SEM pagamento — não é uma venda concluída.
 * - `SF` (Suprimento de Fundo de Caixa) — `tipoMovimento:'E'` (Entrada) — dinheiro colocado
 *   no caixa pelo dono, não uma venda, apesar de ter `pagamentosLista`.
 * - `FC`/`AX` (Fechamento/Abertura de Caixa) — `tipoMovimento:'N'` — operacional, não venda.
 *
 * Nos ~100 documentos inspecionados só apareceu `status:'E'` ('Emitido') — nenhum exemplo de
 * cancelamento/estorno foi observado ainda, então o filtro por texto de status abaixo é um
 * fallback defensivo, não a regra principal (que é `tipoMovimento`+`tipoMovimentoFinanceiro`).
 *
 * Modelos que representam venda para fins de agregação (KPIs, séries, top produtos) — mesmo
 * conjunto usado no filtro `Modelo` de `documento/mercadorias-vendidas/v1`.
 */
export const MODELOS_VENDA = ['65', 'PA'] as const

interface DocumentoParcial {
  valTotal: number | null
  tipoMovimento: string
  tipoMovimentoFinanceiro: string
  status: string
  statusDescricao: string
}

const PALAVRAS_STATUS_INVALIDO = ['cancel', 'estorn']

/** Venda válida = saída de mercadoria com recebimento financeiro efetivo (exclui rascunhos, suprimento e abertura/fechamento de caixa). */
export function isVendaValida(doc: DocumentoParcial): boolean {
  if (doc.valTotal === null || doc.valTotal === undefined) return false
  if (doc.tipoMovimento !== 'S' || doc.tipoMovimentoFinanceiro !== 'R') return false
  const descricao = `${doc.statusDescricao || ''} ${doc.status || ''}`.toLowerCase()
  return !PALAVRAS_STATUS_INVALIDO.some((palavra) => descricao.includes(palavra))
}

/** Heurística para badge de status na tabela de vendas — mesmo fallback defensivo acima. */
export function statusVendaVariant(statusDescricao: string): 'success' | 'danger' | 'warning' | 'neutral' {
  const descricao = statusDescricao.toLowerCase()
  if (descricao.includes('cancel')) return 'danger'
  if (descricao.includes('estorn')) return 'warning'
  if (!descricao) return 'neutral'
  return 'success'
}

/** Flags booleanos da API vêm como string `"S"/"N"`, não `true`/`false` — nunca usar `Boolean(raw.x)` direto. */
export function flagAtivo(valor: unknown): boolean {
  return valor === 'S'
}
