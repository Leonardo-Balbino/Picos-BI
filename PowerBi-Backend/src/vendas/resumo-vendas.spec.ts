import { resumirVendas } from './resumo-vendas'
import type { VendaResponseDto } from './dto/venda-response.dto'

function venda(
  codigo: string, idLoja: string, idCaixa: string, dataHora: string,
  valTotal: number, pagamentos: Array<{ idPagamento: string; descricao: string; valor: number }> = [],
): VendaResponseDto {
  return {
    codigo, numero: codigo, serie: '', modelo: '65', modeloDescricao: 'NFC-e',
    dataHora, dataHoraMovimento: dataHora, idCaixa, idLoja, nomeLoja: idLoja,
    valTotal, tipoMovimento: 'S', tipoMovimentoDescricao: 'Saída',
    tipoMovimentoFinanceiro: 'R', status: 'E', statusDescricao: 'Emitido',
    nomeUsuario: 'Operador', pagamentos,
  }
}

describe('resumirVendas', () => {
  const linhas = [
    venda('1', 'loja-a', '1', '2026-09-21T10:00:00', 100, [{ idPagamento: 'pix', descricao: 'PIX', valor: 100 }]),
    venda('2', 'loja-b', '2', '2026-09-22T11:00:00', 50, [{ idPagamento: 'pix', descricao: 'PIX', valor: 25 }, { idPagamento: 'din', descricao: 'Dinheiro', valor: 25 }]),
    venda('3', 'loja-a', '1', '2026-09-22T12:00:00', -10),
  ]

  it('mantém KPIs, pagamentos e séries de todas as lojas sem enviar linhas individuais', () => {
    const resumo = resumirVendas(linhas, [])
    expect(resumo.idsCaixa).toEqual(['1', '2'])
    expect(resumo.kpisGerais.numeroVendas).toBe(2)
    expect(resumo.kpisGerais.totalPeriodo).toBe(150)
    expect(resumo.kpisGerais.custoTotal).toBeNull()
    expect(resumo.serieTemporal['2026-09-22']).toBe(40)
    expect(resumo.pagamentos.find((p) => p.idPagamento === 'loja-a_pix')).toEqual({ idPagamento: 'loja-a_pix', descricao: 'PIX', valor: 100, nTransacoes: 1 })
    expect(resumo.pagamentos.find((p) => p.idPagamento === 'loja-b_pix')).toEqual({ idPagamento: 'loja-b_pix', descricao: 'PIX', valor: 25, nTransacoes: 1 })
    expect(resumo.pagamentos.reduce((s, p) => s + p.valor, 0)).toBe(150)
    expect(resumo.comparativo).toEqual(expect.arrayContaining([
      { idLoja: 'loja-a', faturamento: 100, numeroVendas: 1 },
      { idLoja: 'loja-b', faturamento: 50, numeroVendas: 1 },
    ]))
    expect(JSON.stringify(resumo)).not.toContain('Operador')
  })

  it('soma custos reais e calcula lucro e margem no mesmo escopo de loja e caixa', () => {
    const resumo = resumirVendas([
      { ...linhas[0], custoTotal: 40 }, { ...linhas[1], custoTotal: 10 },
    ], ['loja-a'], '1')
    expect(resumo.kpisGerais).toMatchObject({ totalPeriodo: 100, custoTotal: 40, lucroBruto: 60, margemLucro: 60, vendasSemCusto: 0, isCustoEstimado: false })
  })
  it('não publica lucro parcial quando há uma venda sem custo; zero explícito é válido', () => {
    const resumo = resumirVendas([{ ...linhas[0], custoTotal: 0 }, linhas[1]], [])
    expect(resumo.kpisGerais).toMatchObject({ custoTotal: null, lucroBruto: null, margemLucro: null, vendasSemCusto: 1 })
    expect(resumirVendas([{ ...linhas[0], custoTotal: 0 }], []).kpisGerais.lucroBruto).toBe(100)
  })
  it('mostra prejuízo quando custo é maior que venda e zero quando não há vendas', () => {
    expect(resumirVendas([{ ...linhas[0], custoTotal: 120 }], []).kpisGerais.lucroBruto).toBe(-20)
    expect(resumirVendas([], []).kpisGerais).toMatchObject({ custoTotal: 0, lucroBruto: 0, margemLucro: 0 })
  })
  it('separa códigos iguais de empresas diferentes e mantém o ID legado de Inhuma', () => {
    const resumo = resumirVendas([
      venda('1', 'loja-inhuma', '1', '2026-10-08T10:00:00', 10, [{ idPagamento: '2', descricao: 'PIX', valor: 10 }]),
      venda('2', 'poliana', '1', '2026-10-08T10:00:00', 20, [{ idPagamento: '2', descricao: 'PIX Banco Brasil', valor: 20 }]),
      venda('3', 'poliana', '1', '2026-10-08T11:00:00', 30, [{ idPagamento: '2', descricao: 'PIX Banco Brasil', valor: 30 }]),
    ], [])
    expect(resumo.pagamentos).toEqual([
      { idPagamento: 'poliana_2', descricao: 'PIX Banco Brasil', valor: 50, nTransacoes: 2 },
      { idPagamento: '2', descricao: 'PIX', valor: 10, nTransacoes: 1 },
    ])
    expect(resumo.kpisGerais.totalPeriodo).toBe(60)
  })

  it('restringe loja e PDV mostrando apenas PDVs das lojas selecionadas', () => {
    const resumo = resumirVendas(linhas, ['loja-b'], '2')
    expect(resumo.kpisGerais.totalPeriodo).toBe(50)
    expect(resumo.idsCaixa).toEqual(['2'])
    expect(resumo.idsLojasPresentes).toEqual(['loja-b'])
    expect(resumo.pagamentos).toHaveLength(2)
  })
})
