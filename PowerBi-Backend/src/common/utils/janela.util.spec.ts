import { UnprocessableEntityException } from '@nestjs/common'
import { validarIntervaloDentroDaJanela } from './janela.util'

describe('validarIntervaloDentroDaJanela', () => {
  const hoje = new Date('2026-07-19T00:00:00.000Z')

  it('aceita um intervalo totalmente dentro da janela', () => {
    const inicio = new Date('2026-05-01T00:00:00.000Z')
    const fim = new Date('2026-07-19T00:00:00.000Z')
    expect(() => validarIntervaloDentroDaJanela(inicio, fim, 90, hoje)).not.toThrow()
  })

  it('aceita um intervalo que começa exatamente no limite da janela (borda inclusive)', () => {
    // hoje - 90 dias = 2026-04-20
    const inicio = new Date('2026-04-20T00:00:00.000Z')
    const fim = hoje
    expect(() => validarIntervaloDentroDaJanela(inicio, fim, 90, hoje)).not.toThrow()
  })

  it('rejeita um intervalo que começa um dia antes do limite da janela', () => {
    const inicio = new Date('2026-04-19T00:00:00.000Z')
    const fim = hoje
    expect(() => validarIntervaloDentroDaJanela(inicio, fim, 90, hoje)).toThrow(UnprocessableEntityException)
  })

  it('rejeita quando "fim" é anterior a "inicio", com um código de erro distinto', () => {
    const inicio = new Date('2026-07-10T00:00:00.000Z')
    const fim = new Date('2026-07-01T00:00:00.000Z')
    try {
      validarIntervaloDentroDaJanela(inicio, fim, 90, hoje)
      fail('deveria ter lançado')
    } catch (erro) {
      expect(erro).toBeInstanceOf(UnprocessableEntityException)
      const resposta = (erro as UnprocessableEntityException).getResponse() as { code: string }
      expect(resposta.code).toBe('INTERVALO_INVALIDO')
    }
  })

  it('usa o código FORA_DA_JANELA_DISPONIVEL quando o intervalo é largo demais', () => {
    try {
      validarIntervaloDentroDaJanela(new Date('2020-01-01T00:00:00.000Z'), hoje, 90, hoje)
      fail('deveria ter lançado')
    } catch (erro) {
      const resposta = (erro as UnprocessableEntityException).getResponse() as { code: string }
      expect(resposta.code).toBe('FORA_DA_JANELA_DISPONIVEL')
    }
  })
})
