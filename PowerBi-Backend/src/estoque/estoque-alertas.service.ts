import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import type { EstoqueUrgenciaQueryDto } from './dto/estoque-urgencia-query.dto'

export function classificarEstoque(saldo: number | null, minimo: number): string {
  if (saldo === null) return 'SEM_SALDO'
  if (saldo <= 0) return 'RUPTURA'
  if (minimo > 0 && saldo <= minimo) return 'BAIXO'
  return minimo > 0 ? 'REGULAR' : 'SEM_MINIMO'
}

@Injectable()
export class EstoqueAlertasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: EstoqueUrgenciaQueryDto, usuario?: UsuarioToken) {
    const ids = escopoLojas(usuario, query.idsLojas)
    const whereLoja = ids ? { idLoja: { in: ids } } : {}
    const [produtos, saldos, logs, locaisAtivos] = await Promise.all([
      this.prisma.produto.findMany({ where: { ...whereLoja, ativo: true }, include: { loja: { select: { nome: true } } }, orderBy: { descricao: 'asc' } }),
      this.prisma.saldoEstoque.findMany({ where: { local: { ...whereLoja, ativo: true } }, include: { local: { select: { idLoja: true, descricao: true } } } }),
      this.prisma.syncLog.findMany({ where: { ...whereLoja, entidade: 'ESTOQUE' }, distinct: ['idLoja'], orderBy: { executadoEm: 'desc' }, select: { idLoja: true, status: true, executadoEm: true } }),
      this.prisma.localEstoque.findMany({ where: { ...whereLoja, ativo: true }, select: { codigo: true, descricao: true, idLoja: true }, orderBy: { descricao: 'asc' } }),
    ])
    const porProduto = new Map<string, typeof saldos>()
    for (const saldo of saldos) {
      const key = JSON.stringify([saldo.local.idLoja, saldo.idMercadoriaVariacao])
      const lista = porProduto.get(key) ?? []
      lista.push(saldo); porProduto.set(key, lista)
    }
    const items = produtos.map(produto => {
      const locais = porProduto.get(JSON.stringify([produto.idLoja, produto.codigoMercadoriaVariacao])) ?? []
      const saldoFisico = locais.length ? locais.reduce((s, l) => s + Number(l.qtdSaldo), 0) : null
      const saldoReservado = locais.length ? locais.reduce((s, l) => s + Number(l.qtdSaldoReserva), 0) : null
      const saldoDisponivel = saldoFisico === null ? null : saldoFisico - (saldoReservado ?? 0)
      const minimoErp = Number(produto.qtdEstoqueMinimo)
      const limite = query.limiteAlerta ?? minimoErp
      const idSecao = (produto as any).idSecao || '1'
      const nomeSecao = (produto as any).nomeSecao || (idSecao === '2' ? 'Insumos' : 'Produtos')
      return {
        codigo: produto.codigoMercadoriaVariacao, descricao: produto.descricao, embalagem: produto.embalagem,
        idSecao, nomeSecao,
        idLoja: produto.idLoja, nomeLoja: produto.loja?.nome ?? 'Unidade não informada',
        saldoFisico, saldoReservado, saldoDisponivel, minimoErp, limiteAlerta: limite,
        status: classificarEstoque(saldoDisponivel, limite),
        reposicaoSugerida: saldoDisponivel !== null && limite > 0 ? Math.max(0, limite - saldoDisponivel) : null,
        locais: locais.map(l => ({ id: l.idLocal, descricao: l.local.descricao, saldoFisico: Number(l.qtdSaldo), saldoReservado: Number(l.qtdSaldoReserva), dataHoraErp: l.dataHora })),
      }
    })

    const secoesMap = new Map<string, { id: string; descricao: string; totalItens: number }>()
    for (const item of items) {
      const idS = item.idSecao
      const nomeS = item.nomeSecao
      const atual = secoesMap.get(idS) ?? { id: idS, descricao: nomeS, totalItens: 0 }
      atual.totalItens++
      secoesMap.set(idS, atual)
    }
    const secoes = [...secoesMap.values()].sort((a, b) => a.descricao.localeCompare(b.descricao))

    const prioridade: Record<string, number> = { RUPTURA: 0, BAIXO: 1, SEM_SALDO: 2, SEM_MINIMO: 3, REGULAR: 4 }
    let itensFiltrados = items.sort((a, b) => prioridade[a.status] - prioridade[b.status] || a.descricao.localeCompare(b.descricao))

    if (query.idSecao && query.idSecao !== 'todas') {
      itensFiltrados = itensFiltrados.filter(i => i.idSecao === query.idSecao)
    }

    return {
      items: itensFiltrados,
      secoes,
      locais: locaisAtivos.map(l => ({ id: l.codigo, descricao: l.descricao, idLoja: l.idLoja })),
      atualizacoes: logs.map(l => ({ idLoja: l.idLoja, status: l.status, executadoEm: l.executadoEm.toISOString() })),
      resumo: {
        produtos: itensFiltrados.length,
        ruptura: itensFiltrados.filter(i => i.status === 'RUPTURA').length,
        baixo: itensFiltrados.filter(i => i.status === 'BAIXO').length,
        semSaldo: itensFiltrados.filter(i => i.status === 'SEM_SALDO').length,
        semMinimo: itensFiltrados.filter(i => i.minimoErp <= 0).length,
      },
    }
  }
}
