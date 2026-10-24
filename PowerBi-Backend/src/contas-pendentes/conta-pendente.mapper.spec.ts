import { mapContaPendente } from './conta-pendente.mapper'
describe('Conta de fiado', () => {
  it('preserva pagamento parcial, saldo e código real do cliente sem deslocar o dia do ERP', () => {
    const c = mapContaPendente({ idDocumento: 113, idPessoa: 61, idSequencia: 2, idParcela: 3, dtLancamento: '2026-09-02T23:59:00', dtVencimento: '2026-09-03T00:00:00', dtPagamento: '2026-09-03T13:00:00', valOrigem: 494.5, valPago: 200, valSaldo: 294.5 })
    expect(c).toMatchObject({ idPessoa: '61', idDocumentoErp: '113', idSequencia: '2', idParcela: '3', valSaldo: 294.5, valPago: 200 })
    expect(c.dtVencimento.toISOString()).toBe('2026-09-03T00:00:00.000Z')
    expect(c.dtPagamento).not.toBeNull()
  })
})
