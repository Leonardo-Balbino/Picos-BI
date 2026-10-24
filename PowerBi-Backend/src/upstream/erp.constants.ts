/**
 * Constantes de domínio de `documento/v1`, confirmadas por inspeção real da API pelo front
 * deste produto (`frontend/src/services/apiConstants.ts`) — não redescobrir.
 *
 * Modelos observados e o que cada um significa:
 * - `65` (NFC-e) e `PA` (Pedido de Venda) — vendas reais, sempre `tipoMovimento:'S'` (Saída) +
 *   `tipoMovimentoFinanceiro:'R'` (Recebimento) + `pagamentosLista` não vazia.
 * - `PP` (Indefinido) — pedido em aberto/rascunho: `tipoMovimento:'S'` mas
 *   `tipoMovimentoFinanceiro:'N'` e SEM pagamento — não é uma venda concluída.
 * - `SF` (Suprimento de Fundo de Caixa) — `tipoMovimento:'E'` (Entrada) — dinheiro colocado no
 *   caixa pelo dono, não uma venda, apesar de ter `pagamentosLista`.
 * - `FC`/`AX` (Fechamento/Abertura de Caixa) — `tipoMovimento:'N'` — operacional, não venda.
 *
 * Modelos que representam venda pra fins de agregação (KPIs, top produtos, comissões) — mesmo
 * conjunto usado no filtro `Modelo` de `documento/mercadorias-vendidas/v1`.
 */
export const MODELOS_VENDA = ['65', 'PA'] as const

/** Flags booleanas da API vêm como string `"S"/"N"`, nunca `true`/`false` — nunca usar
 * `Boolean(raw.x)` direto. */
export function flagAtivo(valor: unknown): boolean {
  return valor === 'S'
}
