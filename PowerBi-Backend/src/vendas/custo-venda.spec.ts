import { mapCustoVenda } from './custo-venda'
const item = (qtd: number, valCusto: number) => ({
  documentoMercadoria: { qtd }, documentoMercadoriaCustoLista: [{ valCusto, valCustoMedio: 99 }],
})
describe('custo real dos itens', () => {
  it('multiplica custo unitário pela quantidade sem somar custo médio novamente', () => {
    expect(mapCustoVenda([item(1, 20.28), item(10, 2.5)])).toBe(45.28)
    expect(mapCustoVenda([item(2, 20.28)])).toBe(40.56)
  })
  it('suporta quantidades fracionárias e arredonda o total em centavos', () => {
    expect(mapCustoVenda([item(1.5, 1.69), item(0.5, 1.69)])).toBe(3.38)
  })
  it('preserva custo explicitamente zero', () => {
    expect(mapCustoVenda([item(3, 0)])).toBe(0)
  })
  it.each([undefined, [], [null], [{ documentoMercadoria: { qtd: 1 }, documentoMercadoriaCustoLista: [] }],
    [item(1, 10), { documentoMercadoria: { qtd: 1 } }], [item(-1, 1)], [item(1, NaN)],
    [{ documentoMercadoria: { qtd: 1 }, documentoMercadoriaCustoLista: [{ valCusto: 1 }, { valCusto: 1 }] }],
  ])('não trata custo ausente, inválido ou ambíguo como zero (%j)', lista => {
    expect(mapCustoVenda(lista)).toBeNull()
  })
})
