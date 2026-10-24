import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import { dateParaDiaIso, diaIsoParaDate, hojeSaoPaulo } from '../common/utils/date.util'
import { ContasReceberPainelService } from './contas-receber-painel.service'
import type { ContasReceberPainelQueryDto } from './dto/contas-receber-painel-query.dto'

interface GrupoRaw {
  id: string; idLoja: string | null; idPessoa: string | null; nomeLoja: string; nome: string;
  razaoSocial: string | null; fantasia: string | null; parcelas: number; parcelasVencidas: number;
  saldoAberto: Prisma.Decimal; saldoVencido: Prisma.Decimal; primeiroVencimento: Date;
}
interface ResumoRaw { total: number; titulos: number; saldoAberto: Prisma.Decimal; saldoVencido: Prisma.Decimal; titulosVencidos: number }

@Injectable()
export class ContasReceberClientesService {
  constructor(private readonly prisma: PrismaService, private readonly painel: ContasReceberPainelService) {}

  private validar(q: ContasReceberPainelQueryDto) {
    if (q.valorMin !== undefined && q.valorMax !== undefined && q.valorMin > q.valorMax) throw new BadRequestException('O valor mínimo não pode ser maior que o máximo.')
    if (q.inicio && q.fim && q.inicio > q.fim) throw new BadRequestException('O período de vencimento é inválido.')
  }
  private periodo(q: ContasReceberPainelQueryDto): Prisma.ContaPendenteWhereInput[] {
    const hoje = hojeSaoPaulo()
    const where: Prisma.ContaPendenteWhereInput[] = []
    if (q.inicio || q.fim) where.push({ dtVencimento: { gte: q.inicio ? diaIsoParaDate(q.inicio) : undefined, lte: q.fim ? diaIsoParaDate(q.fim) : undefined } })
    if (q.situacao === 'vencidas') where.push({ dtVencimento: { lt: hoje } })
    if (q.situacao === 'hoje') where.push({ dtVencimento: hoje })
    if (q.situacao === 'a-vencer') where.push({ dtVencimento: { gt: hoje } })
    if (q.situacao === 'parciais') where.push({ valPago: { gt: 0 } })
    return where
  }
  private grupos(q: ContasReceberPainelQueryDto, ids?: string[]): Prisma.Sql {
    const hoje = hojeSaoPaulo()
    const condicoes = [Prisma.sql`c."tipo" = 'RECEBER' AND c."aindaPendente" = true AND c."valSaldo" > 0`]
    if (ids) condicoes.push(Prisma.sql`c."idLoja" IN (${Prisma.join(ids)})`)
    if (q.inicio) condicoes.push(Prisma.sql`c."dtVencimento" >= ${diaIsoParaDate(q.inicio)}`)
    if (q.fim) condicoes.push(Prisma.sql`c."dtVencimento" <= ${diaIsoParaDate(q.fim)}`)
    if (q.situacao === 'vencidas') condicoes.push(Prisma.sql`c."dtVencimento" < ${hoje}`)
    if (q.situacao === 'hoje') condicoes.push(Prisma.sql`c."dtVencimento" = ${hoje}`)
    if (q.situacao === 'a-vencer') condicoes.push(Prisma.sql`c."dtVencimento" > ${hoje}`)
    if (q.situacao === 'parciais') condicoes.push(Prisma.sql`c."valPago" > 0`)
    const filtros = [Prisma.sql`true`]
    if (q.valorMin !== undefined) filtros.push(Prisma.sql`"saldoAberto" >= ${q.valorMin}`)
    if (q.valorMax !== undefined) filtros.push(Prisma.sql`"saldoAberto" <= ${q.valorMax}`)
    if (q.cliente?.trim()) {
      const busca = '%' + Array.from(q.cliente.trim()).map(c => ['%', '_', String.fromCharCode(92)].includes(c) ? String.fromCharCode(92) + c : c).join('') + '%'
      filtros.push(Prisma.sql`("nome" ILIKE ${busca} OR "razaoSocial" ILIKE ${busca} OR "nomeErp" ILIKE ${busca})`)
    }
    // Pessoa pelo código e loja. Sem código, cada título permanece separado.
    return Prisma.sql`WITH agrupados AS (
      SELECT MIN(c."id"::text) AS "id", c."idLoja", c."idPessoa",
        MAX(COALESCE(l."nome",'Unidade não informada')) AS "nomeLoja",
        MAX(COALESCE(NULLIF(BTRIM(p."fantasia"),''),NULLIF(BTRIM(p."razaoSocial"),''),NULLIF(BTRIM(c."nome"),''),'Cliente não informado')) AS "nome",
        MAX(p."razaoSocial") AS "razaoSocial", MAX(p."fantasia") AS "fantasia", MAX(c."nome") AS "nomeErp",
        COUNT(*)::int AS "parcelas",
        COUNT(*) FILTER (WHERE c."dtVencimento" < ${hoje})::int AS "parcelasVencidas",
        SUM(c."valSaldo") AS "saldoAberto",
        COALESCE(SUM(c."valSaldo") FILTER (WHERE c."dtVencimento" < ${hoje}),0) AS "saldoVencido",
        MIN(c."dtVencimento") AS "primeiroVencimento"
      FROM "ContaPendente" c
      LEFT JOIN "Pessoa" p ON p."codigo" = c."idPessoa" AND p."idLoja" IS NOT DISTINCT FROM c."idLoja"
      LEFT JOIN "Loja" l ON l."id" = c."idLoja"
      WHERE ${Prisma.join(condicoes, ' AND ')}
      GROUP BY c."idLoja", c."idPessoa", CASE WHEN c."idPessoa" IS NULL THEN c."id"::text ELSE NULL END
    ), filtrados AS (SELECT * FROM agrupados WHERE ${Prisma.join(filtros, ' AND ')})`
  }
  async pagina(q: ContasReceberPainelQueryDto, usuario?: UsuarioToken) {
    this.validar(q)
    const ids = escopoLojas(usuario, q.idsLojas)
    const cte = this.grupos(q, ids)
    const coluna = q.ordenar === 'saldo' ? Prisma.sql`"saldoAberto"` : q.ordenar === 'cliente' ? Prisma.sql`"nome"` : Prisma.sql`"primeiroVencimento"`
    const direcao = (q.direcao ?? (q.ordenar === 'saldo' ? 'desc' : 'asc')) === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`
    const [items, totais, logs] = await this.prisma.$transaction([
      this.prisma.$queryRaw<GrupoRaw[]>(Prisma.sql`${cte} SELECT * FROM filtrados ORDER BY ${coluna} ${direcao}, "id" ASC LIMIT ${q.pageSize} OFFSET ${(q.page-1)*q.pageSize}`),
      this.prisma.$queryRaw<ResumoRaw[]>(Prisma.sql`${cte} SELECT COUNT(*)::int AS "total",
        COALESCE(SUM("parcelas"),0)::int AS "titulos", COALESCE(SUM("saldoAberto"),0) AS "saldoAberto",
        COALESCE(SUM("saldoVencido"),0) AS "saldoVencido", COALESCE(SUM("parcelasVencidas"),0)::int AS "titulosVencidos" FROM filtrados`),
      this.prisma.syncLog.findMany({ where: { entidade: 'CONTA_RECEBER', ...(ids ? { idLoja: { in: ids } } : {}) }, distinct: ['idLoja'], orderBy: { executadoEm: 'desc' }, select: { idLoja: true, status: true, executadoEm: true } }),
    ], { isolationLevel: 'RepeatableRead' })
    const soma = totais[0]
    return {
      items: items.map(i => ({ ...i, saldoAberto: Number(i.saldoAberto), saldoVencido: Number(i.saldoVencido), primeiroVencimento: dateParaDiaIso(i.primeiroVencimento) })),
      total: soma.total, page: q.page, pageSize: q.pageSize,
      resumo: { clientes: soma.total, titulos: soma.titulos, saldoAberto: Number(soma.saldoAberto), saldoVencido: Number(soma.saldoVencido), titulosVencidos: soma.titulosVencidos },
      atualizacoes: logs.map(l => ({ idLoja: l.idLoja, status: l.status, executadoEm: l.executadoEm.toISOString() })),
    }
  }
  async parcelas(id: string, q: ContasReceberPainelQueryDto, usuario?: UsuarioToken) {
    this.validar(q)
    const ids = escopoLojas(usuario, q.idsLojas)
    const referencia = await this.prisma.contaPendente.findFirst({ where: { id, tipo: 'RECEBER', ...(ids ? { idLoja: { in: ids } } : {}) } })
    if (!referencia) throw new NotFoundException('Cliente com contas pendentes não encontrado.')
    const where: Prisma.ContaPendenteWhereInput = { tipo: 'RECEBER', aindaPendente: true, valSaldo: { gt: 0 }, idLoja: referencia.idLoja,
      ...(referencia.idPessoa ? { idPessoa: referencia.idPessoa } : { id: referencia.id }),
      AND: this.periodo(q) }
    const [items, total, soma, pessoa] = await this.prisma.$transaction([
      this.prisma.contaPendente.findMany({ where, orderBy: [{ dtVencimento: 'asc' },{ id: 'asc' }], skip: (q.page-1)*q.pageSize, take: q.pageSize, include: { loja: { select: { nome: true } } } }),
      this.prisma.contaPendente.count({ where }),
      this.prisma.contaPendente.aggregate({ where, _sum: { valSaldo: true } }),
      this.prisma.pessoa.findFirst({ where: { codigo: referencia.idPessoa ?? '__sem_codigo__', idLoja: referencia.idLoja } }),
    ], { isolationLevel: 'RepeatableRead' })
    return {
      cliente: { codigo: referencia.idPessoa, nome: pessoa?.fantasia?.trim() || pessoa?.razaoSocial?.trim() || referencia.nome,
        fantasia: pessoa?.fantasia ?? null, razaoSocial: pessoa?.razaoSocial ?? null, cnpjCpf: pessoa?.cnpjCpf ?? null,
        telefone: pessoa?.contatoCelular || pessoa?.contatoFone || null, email: pessoa?.contatoEmail ?? null, cadastroLocalizado: Boolean(pessoa) },
      items: items.map(c => this.painel.apresentar(c, hojeSaoPaulo())), total, page: q.page, pageSize: q.pageSize, saldoAberto: Number(soma._sum.valSaldo ?? 0),
    }
  }
}
