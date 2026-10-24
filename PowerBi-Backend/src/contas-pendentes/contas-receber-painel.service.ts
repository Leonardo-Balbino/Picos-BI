import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { ContaPendente, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import { dateParaDiaIso, diaIsoParaDate, hojeSaoPaulo } from '../common/utils/date.util'
import type { ContasReceberPainelQueryDto } from './dto/contas-receber-painel-query.dto'

export function situacaoConta(vencimento: Date, hoje: Date): string {
  return vencimento < hoje ? 'VENCIDA' : vencimento.getTime() === hoje.getTime() ? 'HOJE' : 'A_VENCER'
}

@Injectable()
export class ContasReceberPainelService {
  constructor(private readonly prisma: PrismaService) {}
  private escopo(usuario?: UsuarioToken, idsLojas?: string): Prisma.ContaPendenteWhereInput {
    const ids = escopoLojas(usuario, idsLojas)
    return { tipo: 'RECEBER', aindaPendente: true, valSaldo: { gt: 0 }, ...(ids ? { idLoja: { in: ids } } : {}) }
  }
  apresentar(c: ContaPendente & { loja: { nome: string } | null }, hoje: Date) {
    return {
      id: c.id, idDocumento: c.idDocumentoErp ?? c.idDocumento, numero: c.numero, nome: c.nome,
      descricao: c.descricao, idLoja: c.idLoja, nomeLoja: c.loja?.nome ?? 'Unidade não informada',
      idPessoa: c.idPessoa, parcela: c.idParcela, sequencia: c.idSequencia,
      dtLancamento: dateParaDiaIso(c.dtLancamento), dtVencimento: dateParaDiaIso(c.dtVencimento),
      dtPagamento: c.dtPagamento ? dateParaDiaIso(c.dtPagamento) : null,
      valOrigem: Number(c.valOrigem), valPago: Number(c.valPago), valDesconto: Number(c.valDesconto),
      valSaldo: Number(c.valSaldo), statusErp: c.status,
      situacao: situacaoConta(c.dtVencimento, hoje), parcial: Number(c.valPago) > 0,
      diasAtraso: Math.max(0, Math.round((hoje.getTime() - c.dtVencimento.getTime()) / 86400000)),
    }
  }
  async pagina(query: ContasReceberPainelQueryDto, usuario?: UsuarioToken) {
    if (query.valorMin !== undefined && query.valorMax !== undefined && query.valorMin > query.valorMax) {
      throw new BadRequestException('O valor mínimo não pode ser maior que o máximo.')
    }
    if (query.inicio && query.fim && query.inicio > query.fim) throw new BadRequestException('O período de vencimento é inválido.')
    const hoje = hojeSaoPaulo()
    const ids = escopoLojas(usuario, query.idsLojas)
    const where = this.escopo(usuario, query.idsLojas)
    const and: Prisma.ContaPendenteWhereInput[] = []
    if (query.cliente?.trim()) and.push({ nome: { contains: query.cliente.trim(), mode: 'insensitive' } })
    if (query.valorMin !== undefined || query.valorMax !== undefined) and.push({ valSaldo: { gte: query.valorMin, lte: query.valorMax } })
    if (query.inicio || query.fim) and.push({ dtVencimento: { gte: query.inicio ? diaIsoParaDate(query.inicio) : undefined, lte: query.fim ? diaIsoParaDate(query.fim) : undefined } })
    if (query.situacao === 'vencidas') and.push({ dtVencimento: { lt: hoje } })
    if (query.situacao === 'hoje') and.push({ dtVencimento: hoje })
    if (query.situacao === 'a-vencer') and.push({ dtVencimento: { gt: hoje } })
    if (query.situacao === 'parciais') and.push({ valPago: { gt: 0 } })
    where.AND = and
    const order: Prisma.ContaPendenteOrderByWithRelationInput = query.ordenar === 'saldo' ? { valSaldo: query.direcao ?? 'desc' }
      : query.ordenar === 'cliente' ? { nome: query.direcao ?? 'asc' } : { dtVencimento: query.direcao ?? 'asc' }
    const [total, soma, vencidas, grupos, items, atualizacoes] = await this.prisma.$transaction([
      this.prisma.contaPendente.count({ where }),
      this.prisma.contaPendente.aggregate({ where, _sum: { valSaldo: true } }),
      this.prisma.contaPendente.aggregate({ where: { AND: [where, { dtVencimento: { lt: hoje } }] }, _sum: { valSaldo: true }, _count: true }),
      this.prisma.contaPendente.groupBy({ by: ['idLoja', 'idPessoa', 'nome'], where, orderBy: { nome: 'asc' } }),
      this.prisma.contaPendente.findMany({ where, orderBy: [order, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { loja: { select: { nome: true } } } }),
      this.prisma.syncLog.findMany({ where: { entidade: 'CONTA_RECEBER', ...(ids ? { idLoja: { in: ids } } : {}) }, distinct: ['idLoja'], orderBy: { executadoEm: 'desc' }, select: { idLoja: true, status: true, executadoEm: true } }),
    ], { isolationLevel: 'RepeatableRead' })
    return {
      items: items.map(c => this.apresentar(c, hoje)), total, page: query.page, pageSize: query.pageSize,
      resumo: { saldoAberto: Number(soma._sum.valSaldo ?? 0), titulos: total,
        clientes: new Set(grupos.map(g => JSON.stringify([g.idLoja, g.idPessoa ?? g.nome]))).size,
        saldoVencido: Number(vencidas._sum.valSaldo ?? 0), titulosVencidos: vencidas._count },
      atualizacoes: atualizacoes.map(l => ({ idLoja: l.idLoja, status: l.status, executadoEm: l.executadoEm.toISOString() })),
    }
  }
  async detalhe(id: string, usuario?: UsuarioToken) {
    const c = await this.prisma.contaPendente.findFirst({ where: { AND: [{ id }, this.escopo(usuario)] }, include: { loja: { select: { nome: true } } } })
    if (!c) throw new NotFoundException('Conta pendente não encontrada.')
    // Relacionamento pelo código real da pessoa e pela unidade; nunca aproxima clientes pelo nome.
    const pessoa = c.idPessoa ? await this.prisma.pessoa.findFirst({ where: { codigo: c.idPessoa, idLoja: c.idLoja } }) : null
    return {
      ...this.apresentar(c, hojeSaoPaulo()),
      cliente: { codigo: c.idPessoa, nome: pessoa?.fantasia?.trim() || pessoa?.razaoSocial?.trim() || c.nome, razaoSocial: pessoa?.razaoSocial ?? null,
        fantasia: pessoa?.fantasia ?? null, cnpjCpf: pessoa?.cnpjCpf ?? null,
        telefone: pessoa?.contatoCelular || pessoa?.contatoFone || null, email: pessoa?.contatoEmail ?? null,
        cadastroLocalizado: Boolean(pessoa) },
    }
  }
}
