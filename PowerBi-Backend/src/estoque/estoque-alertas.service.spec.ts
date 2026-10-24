import { EstoqueAlertasService, classificarEstoque } from './estoque-alertas.service'
describe('Alertas de estoque', () => {
  it('distingue ruptura de saldo ausente e não inventa mínimo para saldo positivo', () => {
    expect(classificarEstoque(null, 10)).toBe('SEM_SALDO')
    expect(classificarEstoque(-2, 0)).toBe('RUPTURA')
    expect(classificarEstoque(0, 0)).toBe('RUPTURA')
    expect(classificarEstoque(5, 0)).toBe('SEM_MINIMO')
    expect(classificarEstoque(5, 5)).toBe('BAIXO')
    expect(classificarEstoque(6, 5)).toBe('REGULAR')
  })
  it('reservas causam urgência sem misturar saldos de outra empresa', async () => {
    const prisma: any = {
      localEstoque: { findMany: jest.fn().mockResolvedValue([{ codigo: 'L', idLoja: 'A', descricao: 'Loja' }, { codigo: 'F', idLoja: 'A', descricao: 'Fábrica' }]) },
      produto: { findMany: jest.fn().mockResolvedValue([{ codigoMercadoriaVariacao: 'P', idLoja: 'A', descricao: 'Produto', embalagem: 'UN', qtdEstoqueMinimo: 4, loja: { nome: 'A' } }]) },
      saldoEstoque: { findMany: jest.fn().mockResolvedValue([
        { idMercadoriaVariacao: 'P', idLocal: 'L', local: { idLoja: 'A', descricao: 'Depósito' }, qtdSaldo: 10, qtdSaldoReserva: 7, dataHora: '' },
        { idMercadoriaVariacao: 'P', idLocal: 'X', local: { idLoja: 'B', descricao: 'Outra' }, qtdSaldo: 100, qtdSaldoReserva: 0, dataHora: '' },
      ]) }, syncLog: { findMany: jest.fn().mockResolvedValue([]) },
    }
    const service = new EstoqueAlertasService(prisma)
    const usuario: any = { perfil: 'FRANQUEADO', lojas: ['A'] }
    const r = await service.listar({}, usuario)
    expect(r.items[0]).toMatchObject({ saldoFisico: 10, saldoReservado: 7, saldoDisponivel: 3, status: 'BAIXO', reposicaoSugerida: 1 })
    expect(r.locais).toEqual([{ id: 'L', idLoja: 'A', descricao: 'Loja' }, { id: 'F', idLoja: 'A', descricao: 'Fábrica' }])
    expect(r.items[0].locais).toHaveLength(1)
    expect(prisma.localEstoque.findMany.mock.calls[0][0].where).toEqual({ idLoja: { in: ['A'] }, ativo: true })
    expect(prisma.produto.findMany.mock.calls[0][0].where.idLoja).toEqual({ in: ['A'] })
    await expect(service.listar({ idsLojas: 'B' }, usuario)).rejects.toMatchObject({ status: 403 })
    await expect(service.listar({}, { ...usuario, lojas: [] })).rejects.toMatchObject({ status: 403 })
  })
  it('soma Loja e Fábrica e conserva local sem saldo separado de saldo zero', async () => {
    const prisma: any = {
      produto: { findMany: jest.fn().mockResolvedValue([
        { codigoMercadoriaVariacao: 'A_1', idLoja: 'A', descricao: 'Coco', embalagem: 'UN', qtdEstoqueMinimo: 0 },
        { codigoMercadoriaVariacao: 'A_2', idLoja: 'A', descricao: 'Gelo', embalagem: 'UN', qtdEstoqueMinimo: 0 },
      ]) },
      localEstoque: { findMany: jest.fn().mockResolvedValue([
        { codigo: 'A_L', descricao: 'Loja', idLoja: 'A' }, { codigo: 'A_F', descricao: 'Fábrica', idLoja: 'A' },
      ]) },
      saldoEstoque: { findMany: jest.fn().mockResolvedValue([
        { idMercadoriaVariacao: 'A_1', idLocal: 'A_L', local: { idLoja: 'A', descricao: 'Loja' }, qtdSaldo: 265, qtdSaldoReserva: 5, dataHora: '' },
        { idMercadoriaVariacao: 'A_1', idLocal: 'A_F', local: { idLoja: 'A', descricao: 'Fábrica' }, qtdSaldo: 20, qtdSaldoReserva: 2, dataHora: '' },
        { idMercadoriaVariacao: 'A_2', idLocal: 'A_L', local: { idLoja: 'A', descricao: 'Loja' }, qtdSaldo: 0, qtdSaldoReserva: 0, dataHora: '' },
      ]) },
      syncLog: { findMany: jest.fn().mockResolvedValue([]) },
    }
    const r = await new EstoqueAlertasService(prisma).listar({}, { perfil: 'FRANQUEADO', lojas: ['A'] } as any)
    const coco = r.items.find(p => p.codigo === 'A_1')!
    expect(coco).toMatchObject({ saldoFisico: 285, saldoReservado: 7, saldoDisponivel: 278 })
    expect(coco.locais.map(l => l.saldoFisico)).toEqual([265, 20])
    const gelo = r.items.find(p => p.codigo === 'A_2')!
    expect(gelo.locais).toEqual([expect.objectContaining({ id: 'A_L', saldoFisico: 0 })])
    expect(r.locais).toHaveLength(2)
  })

})
