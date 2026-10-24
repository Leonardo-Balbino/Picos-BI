import { ContasReceberPainelService, situacaoConta } from './contas-receber-painel.service'
import { ContasReceberPainelQueryDto } from './dto/contas-receber-painel-query.dto'
describe('Contas a receber: autorização e filtros', () => {
  it('vence hoje sem considerar horário UTC do servidor como vencida', () => {
    const hoje = new Date('2026-10-08T00:00:00Z')
    expect(situacaoConta(new Date('2026-10-07T00:00:00Z'), hoje)).toBe('VENCIDA')
    expect(situacaoConta(hoje, hoje)).toBe('HOJE')
    expect(situacaoConta(new Date('2026-10-09T00:00:00Z'), hoje)).toBe('A_VENCER')
  })
  it('recusa valores invertidos e filtro de outra empresa antes de consultar o banco', async () => {
    const prisma: any = { contaPendente: { findFirst: jest.fn().mockResolvedValue(null) } }
    const service = new ContasReceberPainelService(prisma)
    await expect(service.pagina(Object.assign(new ContasReceberPainelQueryDto(), { valorMin: 30, valorMax: 10 }))).rejects.toMatchObject({ status: 400 })
    await expect(service.pagina(Object.assign(new ContasReceberPainelQueryDto(), { idsLojas: 'B' }), { perfil: 'FRANQUEADO', lojas: ['A'] } as any)).rejects.toMatchObject({ status: 403 })
    await expect(service.detalhe('uuid-de-outra-empresa', { perfil: 'FRANQUEADO', lojas: ['A'] } as any)).rejects.toMatchObject({ status: 404 })
    expect(prisma.contaPendente.findFirst.mock.calls[0][0].where.AND[1]).toMatchObject({ idLoja: { in: ['A'] }, aindaPendente: true, valSaldo: { gt: 0 } })
  })
})
