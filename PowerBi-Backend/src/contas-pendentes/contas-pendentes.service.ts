import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import type { TipoConta } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { dateParaDiaIso, diaIsoParaDate } from '../common/utils/date.util'
import { mapContaPendente, type ContaPendenteRaw } from './conta-pendente.mapper'
import type { ContaPendenteResponseDto } from './dto/conta-pendente-response.dto'
import type { ContasPendentesQueryDto } from './dto/contas-pendentes-query.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

const ENDPOINT_POR_TIPO: Record<TipoConta, string> = {
  RECEBER: '/conta-receber/pendentes/v1',
  PAGAR: '/conta-pagar/pendentes/v1',
}

/**
 * Ambos os endpoints upstream (`conta-receber/pendentes/v1`, `conta-pagar/pendentes/v1`) exigem
 * `inicio`/`fim` mesmo sendo "pendentes" — o front sempre chamou com o período do filtro global
 * (ver `frontend/src/services/dataService.ts`), então não está confirmado se a API filtra por
 * `dtLancamento` ou `dtVencimento`, nem se aceita omitir os parâmetros pra devolver tudo.
 *
 * <PONTO DE DECISÃO NÃO RESOLVIDO — precisa validação contra a API real> Até confirmar,
 * sincronizamos com uma janela generosa (2 anos pra trás, 1 ano pra frente a partir de hoje)
 * pra capturar qualquer conta plausivelmente ainda aberta, em vez de assumir que "sem
 * parâmetro" funciona. Ajustar os `ANOS_*` abaixo se a faixa real precisar ser maior.
 */
const ANOS_PARA_TRAS = 2
const ANOS_PARA_FRENTE = 1

@Injectable()
export class ContasPendentesService {
  private readonly logger = new Logger(ContasPendentesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  async sincronizarSnapshot(tipo: TipoConta, idLoja?: string, token?: string): Promise<number> {
    const hoje = new Date()
    const inicio = dateParaDiaIso(
      new Date(hoje.getFullYear() - ANOS_PARA_TRAS, hoje.getMonth(), hoje.getDate()),
    )
    const fim = dateParaDiaIso(
      new Date(hoje.getFullYear() + ANOS_PARA_FRENTE, hoje.getMonth(), hoje.getDate()),
    )

    const itens = await this.upstream.getAllPages<ReturnType<typeof mapContaPendente>, ContaPendenteRaw>(
      ENDPOINT_POR_TIPO[tipo],
      { inicio, fim, limit: 100 },
      mapContaPendente,
      token,
    )

    const dadosPorLoja = itens.map(item => {
      // A primeira parcela preserva a chave legada. As demais não podem sobrescrever a primeira.
      const sequencia = item.idSequencia ?? '1'
      const parcela = item.idParcela ?? '1'
      const chaveErp = sequencia === '1' && parcela === '1' ? item.idDocumento
        : item.idDocumento + '__s' + encodeURIComponent(sequencia) + '__p' + encodeURIComponent(parcela)
      return { ...item, idDocumentoErp: item.idDocumentoErp ?? item.idDocumento,
        idPessoa: item.idPessoa ? codigoDaLoja(item.idPessoa, idLoja) : null,
        idDocumento: codigoDaLoja(chaveErp, idLoja) }
    })
    const idsAtuais = new Set(dadosPorLoja.map((i) => i.idDocumento))

    await this.prisma.$transaction([
      ...dadosPorLoja.map((c) =>
        this.prisma.contaPendente.upsert({
          where: { tipo_idDocumento: { tipo, idDocumento: c.idDocumento } },
          create: { tipo, ...c, idLoja, aindaPendente: true, liquidadaEm: null },
          update: { ...c, idLoja, aindaPendente: true, liquidadaEm: null },
        }),
      ),
      // Soft-delete: liquida apenas contas pertencentes a esta unidade específica
      this.prisma.contaPendente.updateMany({
        where: {
          tipo,
          ...(idLoja ? { idLoja } : {}),
          aindaPendente: true,
          idDocumento: idsAtuais.size > 0 ? { notIn: Array.from(idsAtuais) } : undefined,
        },
        data: { aindaPendente: false, liquidadaEm: new Date() },
      }),
    ])

    this.logger.log(
      `Contas a ${tipo === 'RECEBER' ? 'receber' : 'pagar'}: ${itens.length} pendente(s) sincronizada(s)${idLoja ? ` (loja: ${idLoja})` : ''}.`,
    )
    return itens.length
  }

  async listar(
    tipo: TipoConta,
    query: ContasPendentesQueryDto,
    usuario?: UsuarioToken,
  ): Promise<ContaPendenteResponseDto[]> {
    const where: any = {
      tipo,
      aindaPendente: true,
      dtVencimento: {
        gte: query.inicio ? diaIsoParaDate(query.inicio) : undefined,
        lte: query.fim ? diaIsoParaDate(query.fim) : undefined,
      },
    }

    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (query.idLoja && query.idLoja !== 'todas') {
        if (!usuario.lojas.includes(query.idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar as contas desta unidade.')
        }
        where.idLoja = query.idLoja
      } else {
        where.idLoja = { in: usuario.lojas }
      }
    } else if (query.idLoja && query.idLoja !== 'todas') {
      where.idLoja = query.idLoja
    }

    const linhas = await this.prisma.contaPendente.findMany({
      where,
      orderBy: { dtVencimento: 'asc' },
    })

    return linhas.map((c) => ({
      idDocumento: c.idDocumento,
      numero: c.numero,
      nome: c.nome,
      descricao: c.descricao,
      dtLancamento: dateParaDiaIso(c.dtLancamento),
      dtVencimento: dateParaDiaIso(c.dtVencimento),
      dtPagamento: c.dtPagamento ? dateParaDiaIso(c.dtPagamento) : null,
      valOrigem: Number(c.valOrigem),
      valPago: Number(c.valPago),
      valDesconto: Number(c.valDesconto),
      valSaldo: Number(c.valSaldo),
      status: c.status,
    }))
  }

  async painel(
    tipo: TipoConta,
    query: ContasPendentesQueryDto,
    usuario?: UsuarioToken,
  ) {
    const whereLoja: any = {}
    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (query.idLoja && query.idLoja !== 'todas') {
        if (!usuario.lojas.includes(query.idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar as contas desta unidade.')
        }
        whereLoja.idLoja = query.idLoja
      } else {
        whereLoja.idLoja = { in: usuario.lojas }
      }
    } else if (query.idLoja && query.idLoja !== 'todas') {
      whereLoja.idLoja = query.idLoja
    }

    const where: any = {
      tipo,
      ...whereLoja,
      dtVencimento: {
        gte: query.inicio ? diaIsoParaDate(query.inicio) : undefined,
        lte: query.fim ? diaIsoParaDate(query.fim) : undefined,
      },
    }

    const linhas = await this.prisma.contaPendente.findMany({
      where,
      include: { loja: { select: { nome: true } } },
      orderBy: { dtVencimento: 'asc' },
    })

    const hoje = dateParaDiaIso(new Date())
    let totalAberto = 0
    let totalVencido = 0
    let totalLiquidado = 0
    let totalGeral = 0
    let quantidadeAberto = 0
    let quantidadeVencido = 0
    let quantidadeLiquidado = 0

    const fluxoMap = new Map<string, { data: string; aberto: number; vencido: number; liquidado: number }>()

    const items = linhas.map((c) => {
      const vencimentoIso = dateParaDiaIso(c.dtVencimento)
      const valSaldo = Number(c.valSaldo)
      const valPago = Number(c.valPago)
      const valOrigem = Number(c.valOrigem)

      let situacao: 'VENCIDO' | 'A_VENCER' | 'LIQUIDADO' = 'A_VENCER'
      if (!c.aindaPendente || valSaldo <= 0 || c.dtPagamento) {
        situacao = 'LIQUIDADO'
        totalLiquidado += valPago || valOrigem
        quantidadeLiquidado++
      } else if (vencimentoIso < hoje) {
        situacao = 'VENCIDO'
        totalVencido += valSaldo
        totalAberto += valSaldo
        quantidadeVencido++
        quantidadeAberto++
      } else {
        situacao = 'A_VENCER'
        totalAberto += valSaldo
        quantidadeAberto++
      }
      totalGeral += valOrigem

      const mesOuData = vencimentoIso.slice(0, 7)
      const fluxoAtual = fluxoMap.get(mesOuData) ?? { data: mesOuData, aberto: 0, vencido: 0, liquidado: 0 }
      if (situacao === 'LIQUIDADO') fluxoAtual.liquidado += valPago || valOrigem
      else if (situacao === 'VENCIDO') fluxoAtual.vencido += valSaldo
      else fluxoAtual.aberto += valSaldo
      fluxoMap.set(mesOuData, fluxoAtual)

      return {
        idDocumento: c.idDocumento,
        numero: c.numero,
        nome: c.nome,
        descricao: c.descricao,
        idLoja: c.idLoja,
        nomeLoja: c.loja?.nome ?? 'Unidade',
        dtLancamento: dateParaDiaIso(c.dtLancamento),
        dtVencimento: vencimentoIso,
        dtPagamento: c.dtPagamento ? dateParaDiaIso(c.dtPagamento) : null,
        valOrigem,
        valPago,
        valDesconto: Number(c.valDesconto),
        valSaldo,
        status: c.status,
        situacao,
        aindaPendente: c.aindaPendente,
      }
    })

    const fluxo = [...fluxoMap.values()].sort((a, b) => a.data.localeCompare(b.data))

    return {
      kpis: {
        totalAberto: Math.round(totalAberto * 100) / 100,
        totalVencido: Math.round(totalVencido * 100) / 100,
        totalLiquidado: Math.round(totalLiquidado * 100) / 100,
        totalGeral: Math.round(totalGeral * 100) / 100,
        quantidadeAberto,
        quantidadeVencido,
        quantidadeLiquidado,
        totalTitulos: linhas.length,
      },
      fluxo,
      items,
    }
  }
}
