import { isVendaValida } from './venda-valida.util'

function doc(overrides: Partial<Parameters<typeof isVendaValida>[0]> = {}) {
  return {
    valTotal: 100,
    tipoMovimento: 'S',
    tipoMovimentoFinanceiro: 'R',
    status: 'E',
    statusDescricao: 'Emitido',
    ...overrides,
  }
}

describe('isVendaValida', () => {
  it.each(['PV', 'PP'])('rejeita %s mesmo emitido com valor e recebimento', (modelo) => {
    expect(isVendaValida(doc({ modelo }))).toBe(false)
  })
  it('aceita venda PA com valor positivo', () => {
    expect(isVendaValida(doc({ modelo: 'PA' }))).toBe(true)
  })

  it('aceita um documento emitido normal', () => {
    expect(isVendaValida(doc())).toBe(true)
  })

  it('rejeita valTotal nulo/indefinido', () => {
    expect(isVendaValida(doc({ valTotal: null }))).toBe(false)
    expect(isVendaValida(doc({ valTotal: undefined }))).toBe(false)
  })

  it('rejeita tipoMovimento diferente de "S" (saída)', () => {
    expect(isVendaValida(doc({ tipoMovimento: 'E' }))).toBe(false)
  })

  it('rejeita tipoMovimentoFinanceiro diferente de "R" (recebimento) — ex.: PP em aberto', () => {
    expect(isVendaValida(doc({ tipoMovimentoFinanceiro: 'N' }))).toBe(false)
  })

  it('rejeita status cancelado', () => {
    expect(isVendaValida(doc({ status: 'C', statusDescricao: 'Cancelado' }))).toBe(false)
  })

  it('rejeita status estornado', () => {
    expect(isVendaValida(doc({ status: 'ES', statusDescricao: 'Estornado' }))).toBe(false)
  })

  // <BUG CORRIGIDO> estes dois casos passavam antes de 'exclu'/'rascunho' entrarem na lista de
  // palavras inválidas — inflavam faturamento sem pagamento associado (ver nota no arquivo).
  it('rejeita status excluído', () => {
    expect(isVendaValida(doc({ status: 'X', statusDescricao: 'Excluido' }))).toBe(false)
  })

  it('rejeita status rascunho', () => {
    expect(isVendaValida(doc({ status: 'R', statusDescricao: 'Rascunho' }))).toBe(false)
  })
})
