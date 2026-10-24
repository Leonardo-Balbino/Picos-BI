/**
 * Regra de negócio "venda válida", migrada do front (`frontend/src/services/apiConstants.ts`,
 * `isVendaValida`) pra ser a única fonte de verdade — decisão registrada em `README.md`
 * ("Decisões que merecem revisão", item 3). O endpoint `GET /vendas` só devolve vendas válidas;
 * o front não precisa mais reimplementar este filtro depois que passar a consumir este backend.
 *
 * Venda válida = saída de mercadoria com recebimento financeiro efetivo (exclui rascunhos
 * `PP`, suprimento de caixa `SF` e abertura/fechamento de caixa `FC`/`AX` — ver `erp.constants.ts`).
 *
 * <BUG CORRIGIDO — confirmado por inspeção real> `'exclu'`/`'rascunho'` faltavam nesta lista:
 * documentos com `status:'X'`/`statusDescricao:'Excluido'` (modelo `55`, fora de `MODELOS_VENDA`
 * mas não filtrado aqui por modelo) e `status:'R'`/`'Rascunho'` (modelo `65`, ainda não
 * confirmado) passavam com `tipoMovimento:'S'` + `tipoMovimentoFinanceiro:'R'` intactos, sem
 * bater em nenhuma das duas palavras antigas — inflavam o faturamento total (R$ 725 em 3
 * documentos numa janela de 365 dias de um cliente real) sem aparecer nos totais por forma de
 * pagamento (documento excluído/rascunho não tem `pagamentosLista` de verdade), causando a
 * tela de Pagamentos "não bater" com a Visão Geral.
 */

const PALAVRAS_STATUS_INVALIDO = ['cancel', 'estorn', 'exclu', 'rascunho']

export interface DocumentoParcial {
  modelo?: unknown
  valTotal: unknown
  tipoMovimento: string
  tipoMovimentoFinanceiro: string
  status: string
  statusDescricao: string
}

export function isVendaValida(doc: DocumentoParcial): boolean {
  if (['PV', 'PP'].includes(String(doc.modelo ?? '').trim().toUpperCase())) return false
  if (doc.valTotal === null || doc.valTotal === undefined) return false
  if (doc.tipoMovimento !== 'S' || doc.tipoMovimentoFinanceiro !== 'R') return false
  const descricao = `${doc.statusDescricao || ''} ${doc.status || ''}`.toLowerCase()
  return !PALAVRAS_STATUS_INVALIDO.some((palavra) => descricao.includes(palavra))
}
