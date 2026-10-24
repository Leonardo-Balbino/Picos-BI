import { mapVendedoresItens, resumirVendedores } from './vendedores-venda'
import { mapVenda } from './venda.mapper'
import { VendasService } from './vendas.service'
import { criarRedisServiceFake } from '../redis/redis-service.fake'

const item = (id: number, valor: number, nome = 'Ana') => ({ documentoMercadoria: { idPessoaFuncionario: id, nomePessoaFuncionario: nome, valTotalLiquido: valor } })
const venda = (vendedores: unknown, overrides = {}) => ({ codigo: '1', idLoja: 'loja-a', loja: { nome: 'A' }, valTotal: 30, tipoMovimento: 'S', tipoMovimentoFinanceiro: 'R', status: 'E', statusDescricao: 'Emitido', vendedores, ...overrides })

describe('Vendas por vendedor', () => {
  it('soma itens do vendedor sem repetir a quantidade de documentos', () => {
    const grupos = mapVendedoresItens([item(1, 10), item(1, 20)])
    expect(grupos).toEqual([{ codigo: '1', nome: 'Ana', valor: 30 }])
    const r = resumirVendedores([venda(grupos)])
    expect(r.items[0]).toMatchObject({ quantidadeVendas: 1, totalVendido: 30 })
  })
  it('dois vendedores recebem apenas os valores de seus itens na mesma venda', () => {
    const r = resumirVendedores([venda(mapVendedoresItens([item(1, 10), item(2, 20, 'Bia')]))])
    expect(r.items.map(i => [i.nome, i.quantidadeVendas, i.totalVendido])).toEqual([['Bia',1,20],['Ana',1,10]])
    expect(r.totalAtribuido).toBe(30)
    expect(r.vendasAnalisadas).toBe(1)
  })
  it('não atribui itens sem vendedor ao operador de caixa', () => {
    const r = resumirVendedores([venda(mapVendedoresItens([item(0, 30, 'Operador')]))])
    expect(r.items[0].nome).toBe('Sem vendedor informado')
  })
  it('exclui canceladas, rascunhos e valores não positivos', () => {
    const g = mapVendedoresItens([item(1,30)])
    const r = resumirVendedores([venda(g), venda(g,{statusDescricao:'Cancelado'}), venda(g,{statusDescricao:'Rascunho'}),venda(g,{valTotal:0})])
    expect(r.vendasAnalisadas).toBe(1)
    expect(r.items[0].quantidadeVendas).toBe(1)
  })
  it('separa IDs iguais de empresas diferentes e nomes iguais com IDs diferentes', () => {
    const r = resumirVendedores([venda(mapVendedoresItens([item(1,30)])), venda(mapVendedoresItens([item(1,30)]),{idLoja:'loja-b'}),venda(mapVendedoresItens([item(2,30)]))])
    expect(r.items).toHaveLength(3)
  })
  it('distingue histórico não detalhado de venda sem vendedor informado', () => {
    const r = resumirVendedores([venda(null),venda([])])
    expect(r.vendasSemDetalhamento).toBe(1)
    expect(r.valorSemDetalhamento).toBe(30)
    expect(r.items[0].quantidadeVendas).toBe(1)
    expect(r.totalVendas).toBe(60)
  })
  it('expõe diferenças entre valor do documento e itens sem inventar rateio', () => {
    const r = resumirVendedores([venda(mapVendedoresItens([item(1,25)]))])
    expect(r.diferencaItens).toBe(5)
    expect(r.items[0].totalVendido).toBe(25)
  })
  it('ausência da lista não apaga vínculos e valores inválidos não contaminam totais', () => {
    expect(mapVenda({dataHora:'2026-10-08'}).vendedores).toBeUndefined()
    expect(mapVenda({dataHora:'2026-10-08',mercadoriasLista:[]}).vendedores).toEqual([])
    expect(mapVendedoresItens([item(1,NaN),item(1,0.1),item(1,0.2)])).toEqual([{codigo:'1',nome:'Ana',valor:0.3}])
  })
  it('deduplica o vendedor por documento mesmo que o JSON contenha duas entradas', () => {
    const r = resumirVendedores([venda([{codigo:'1',nome:'Ana',valor:10},{codigo:'1',nome:'Ana',valor:20}])])
    expect(r.items[0]).toMatchObject({totalVendido:30,quantidadeVendas:1})
  })
  it('autoriza o escopo antes da consulta e aplica loja e caixa', async () => {
    const prisma = {venda:{findMany:jest.fn().mockResolvedValue([])}}
    const service = new VendasService(prisma as any, criarRedisServiceFake() as any, {} as any, {get:()=>365} as any)
    const user = {perfil:'FRANQUEADO',lojas:['loja-a']} as any
    await expect(service.vendedoresPeriodo('2026-10-08','2026-10-08','loja-b','1',user)).rejects.toThrow()
    expect(prisma.venda.findMany).not.toHaveBeenCalled()
    await service.vendedoresPeriodo('2026-10-08','2026-10-08','loja-a','1',user)
    expect(prisma.venda.findMany.mock.calls[0][0].where).toMatchObject({idLoja:{in:['loja-a']},idCaixa:'1'})
  })
})
