import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import { isVendaValida } from './venda-valida.util'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

export interface LinhaPlanoContas {
  codigo?: string
  descricao: string
  valorAtual: number
  valorAnterior: number
  percentual: number
}

export interface EstruturaDreItem {
  rotulo: string
  tipo: 'RECEITA' | 'CUSTO' | 'DESPESA' | 'RESULTADO'
  valorAtual: number
  valorAnterior: number
  variacaoNominal: number
  variacaoPercentual: number
  percentualVerticalAtual: number
  percentualVerticalAnterior: number
  detalhes?: LinhaPlanoContas[]
}

export interface LinhaDre {
  codigo: string
  descricao: string
  tipo: 'RECEITA' | 'DEDUCAO' | 'SUBTOTAL' | 'CUSTO' | 'DESPESA' | 'RESULTADO'
  destaque?: boolean
  valorAtual: number
  percentualVerticalAtual: number
  valorAnterior: number
  percentualVerticalAnterior: number
  variacaoNominal: number
  variacaoPercentual: number
}

export interface DreResultadoDto {
  periodoAtual: { inicio: string; fim: string }
  periodoAnterior: { inicio: string; fim: string }
  kpis: {
    receitaLiquida: number
    lucroBruto: number
    margemBruta: number
    despesasOperacionais: number
    resultadoLiquido: number
    margemLiquida: number
  }
  // Estrutura direta em 4 partes conforme especificação:
  // 1. Receita
  // 2. (-) Custos
  // 3. (-) Despesas (com Plano de Contas detalhado)
  // 4. (=) Resultado Líquido
  estrutura: {
    receita: EstruturaDreItem
    custos: EstruturaDreItem
    despesas: EstruturaDreItem
    resultadoLiquido: EstruturaDreItem
  }
  linhas: LinhaDre[]
  despesasDetalhadas: LinhaPlanoContas[]
}

const moeda = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function limparDescricaoPlano(desc: string): string {
  // Remove espaços de indentação, prefixos do tipo "4.1.", "7.1.", etc.
  return desc
    .replace(/^[\s\u2000-\u200F\u00A0]+/g, '')
    .replace(/^(\d+\.)+\s*/, '')
    .trim()
}

@Injectable()
export class DreService {
  private readonly logger = new Logger(DreService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  async calcular(
    inicio: string,
    fim: string,
    inicioAnterior?: string,
    fimAnterior?: string,
    idsLojas = '',
    usuario?: UsuarioToken,
  ): Promise<DreResultadoDto> {
    const ids = escopoLojas(usuario, idsLojas)

    // Período atual
    const dtInicio = new Date(`${inicio}T00:00:00.000Z`)
    const dtFim = new Date(`${fim}T23:59:59.999Z`)
    const diffDias = Math.max(1, Math.round((dtFim.getTime() - dtInicio.getTime()) / (1000 * 60 * 60 * 24)))

    // Período comparativo
    const dtInicioAnt = inicioAnterior
      ? new Date(`${inicioAnterior}T00:00:00.000Z`)
      : new Date(dtInicio.getTime() - diffDias * 86400000)
    const dtFimAnt = fimAnterior
      ? new Date(`${fimAnterior}T23:59:59.999Z`)
      : new Date(dtInicio.getTime() - 1)

    const inicioAntIso = dtInicioAnt.toISOString().slice(0, 10)
    const fimAntIso = dtFimAnt.toISOString().slice(0, 10)

    // Identifica lojas para buscar tokens da API externa
    const lojas = await this.prisma.loja.findMany({
      where: ids && ids.length > 0 ? { id: { in: ids } } : { ativo: true },
      select: { id: true, erpToken: true },
    })

    const [dadosAtual, dadosAnt] = await Promise.all([
      this.coletarPeriodo(dtInicio, dtFim, inicio, fim, ids, lojas),
      this.coletarPeriodo(dtInicioAnt, dtFimAnt, inicioAntIso, fimAntIso, ids, lojas),
    ])

    const rlAtual = dadosAtual.receitaLiquida
    const rlAnt = dadosAnt.receitaLiquida

    // Combina e consolida as linhas do Plano de Contas das Despesas
    const mapaDespesasAnt = new Map<string, number>()
    for (const d of dadosAnt.despesasPlanoContas) {
      mapaDespesasAnt.set(d.descricao.toUpperCase(), d.valor)
    }

    const mapaDespesasAtual = new Map<string, number>()
    for (const d of dadosAtual.despesasPlanoContas) {
      mapaDespesasAtual.set(d.descricao.toUpperCase(), d.valor)
    }

    const todasDescricoes = new Set([
      ...mapaDespesasAtual.keys(),
      ...mapaDespesasAnt.keys(),
    ])

    const totalDespesasAtual = dadosAtual.despesas
    const despesasDetalhadas: LinhaPlanoContas[] = Array.from(todasDescricoes).map((desc) => {
      const vAt = mapaDespesasAtual.get(desc) ?? 0
      const vAn = mapaDespesasAnt.get(desc) ?? 0
      const perc = totalDespesasAtual > 0 ? Math.round((vAt / totalDespesasAtual) * 10000) / 100 : 0
      return {
        descricao: desc,
        valorAtual: moeda(vAt),
        valorAnterior: moeda(vAn),
        percentual: perc,
      }
    }).sort((a, b) => b.valorAtual - a.valorAtual || a.descricao.localeCompare(b.descricao))

    // Helper para criar item da estrutura
    const criarItemEstrutura = (
      rotulo: string,
      tipo: EstruturaDreItem['tipo'],
      vAtual: number,
      vAnt: number,
      detalhes?: LinhaPlanoContas[],
    ): EstruturaDreItem => {
      const vAt = moeda(vAtual)
      const vAn = moeda(vAnt)
      const varNom = moeda(vAt - vAn)
      const varPerc = vAn !== 0 ? Math.round(((vAt - vAn) / Math.abs(vAn)) * 10000) / 100 : 0
      const avAtual = rlAtual > 0 ? Math.round((vAt / rlAtual) * 10000) / 100 : 0
      const avAnt = rlAnt > 0 ? Math.round((vAn / rlAnt) * 10000) / 100 : 0

      return {
        rotulo,
        tipo,
        valorAtual: vAt,
        valorAnterior: vAn,
        variacaoNominal: varNom,
        variacaoPercentual: varPerc,
        percentualVerticalAtual: avAtual,
        percentualVerticalAnterior: avAnt,
        detalhes,
      }
    }

    const estrutura = {
      receita: criarItemEstrutura('1. Receita', 'RECEITA', dadosAtual.receitaLiquida, dadosAnt.receitaLiquida),
      custos: criarItemEstrutura('2. (-) Custos', 'CUSTO', -Math.abs(dadosAtual.cmv), -Math.abs(dadosAnt.cmv)),
      despesas: criarItemEstrutura('3. (-) Despesas', 'DESPESA', -Math.abs(dadosAtual.despesas), -Math.abs(dadosAnt.despesas), despesasDetalhadas),
      resultadoLiquido: criarItemEstrutura('4. (=) Resultado Líquido', 'RESULTADO', dadosAtual.resultadoLiquido, dadosAnt.resultadoLiquido),
    }

    // Linhas analíticas detalhadas
    const montarLinha = (
      codigo: string,
      descricao: string,
      tipo: LinhaDre['tipo'],
      vAtual: number,
      vAnt: number,
      destaque = false,
    ): LinhaDre => {
      const vAt = moeda(vAtual)
      const vAn = moeda(vAnt)
      const varNom = moeda(vAt - vAn)
      const varPerc = vAn !== 0 ? Math.round(((vAt - vAn) / Math.abs(vAn)) * 10000) / 100 : 0
      const avAtual = rlAtual > 0 ? Math.round((vAt / rlAtual) * 10000) / 100 : 0
      const avAnt = rlAnt > 0 ? Math.round((vAn / rlAnt) * 10000) / 100 : 0

      return {
        codigo,
        descricao,
        tipo,
        destaque,
        valorAtual: vAt,
        percentualVerticalAtual: avAtual,
        valorAnterior: vAn,
        percentualVerticalAnterior: avAnt,
        variacaoNominal: varNom,
        variacaoPercentual: varPerc,
      }
    }

    const linhas: LinhaDre[] = [
      montarLinha('1', '1. Receita', 'RECEITA', dadosAtual.receitaLiquida, dadosAnt.receitaLiquida, true),
      montarLinha('2', '2. (-) Custos', 'CUSTO', -Math.abs(dadosAtual.cmv), -Math.abs(dadosAnt.cmv), true),
      montarLinha('3', '3. (-) Despesas', 'DESPESA', -Math.abs(dadosAtual.despesas), -Math.abs(dadosAnt.despesas), true),
    ]

    // Adiciona linhas filhas do Plano de Contas sob Despesas
    for (const d of despesasDetalhadas) {
      if (d.valorAtual > 0 || d.valorAnterior > 0) {
        linhas.push(montarLinha(`3.${d.descricao}`, `   ↳ ${d.descricao}`, 'DESPESA', -Math.abs(d.valorAtual), -Math.abs(d.valorAnterior), false))
      }
    }

    linhas.push(montarLinha('4', '4. (=) Resultado Líquido', 'RESULTADO', dadosAtual.resultadoLiquido, dadosAnt.resultadoLiquido, true))

    return {
      periodoAtual: { inicio, fim },
      periodoAnterior: { inicio: inicioAntIso, fim: fimAntIso },
      kpis: {
        receitaLiquida: dadosAtual.receitaLiquida,
        lucroBruto: dadosAtual.lucroBruto,
        margemBruta: rlAtual > 0 ? Math.round((dadosAtual.lucroBruto / rlAtual) * 10000) / 100 : 0,
        despesasOperacionais: dadosAtual.despesas,
        resultadoLiquido: dadosAtual.resultadoLiquido,
        margemLiquida: rlAtual > 0 ? Math.round((dadosAtual.resultadoLiquido / rlAtual) * 10000) / 100 : 0,
      },
      estrutura,
      linhas,
      despesasDetalhadas,
    }
  }

  private async coletarPeriodo(
    inicio: Date,
    fim: Date,
    inicioIso: string,
    fimIso: string,
    idsLojas?: string[],
    lojasComToken?: Array<{ id: string; erpToken: string | null }>,
  ) {
    const whereLoja = idsLojas && idsLojas.length > 0 ? { idLoja: { in: idsLojas } } : {}

    // 1. Vendas locais do Postgres (excluindo pré-vendas estritamente)
    const [vendas, contasPagarDb] = await Promise.all([
      this.prisma.venda.findMany({
        where: {
          data: { gte: inicio, lte: fim },
          modelo: { notIn: ['PV', 'PP', 'TR', 'SF', 'FC', 'AX', 'AR', 'AS', 'RU', 'EA', 'AC'] },
          ...whereLoja,
        },
        select: {
          codigo: true,
          modelo: true,
          valTotal: true,
          custoTotal: true,
          tipoMovimento: true,
          tipoMovimentoFinanceiro: true,
          status: true,
          statusDescricao: true,
        },
      }),
      this.prisma.contaPendente.findMany({
        where: {
          tipo: 'PAGAR',
          OR: [
            { dtVencimento: { gte: inicio, lte: fim } },
            { dtPagamento: { gte: inicio, lte: fim } },
          ],
          ...whereLoja,
        },
        select: {
          descricao: true,
          valOrigem: true,
          valPago: true,
          valSaldo: true,
          aindaPendente: true,
          status: true,
        },
      }),
    ])

    let receitaBruta = 0
    let deducoes = 0
    let cmv = 0

    for (const v of vendas) {
      if (!isVendaValida(v)) {
        // Apenas devoluções e cancelamentos reais de pedidos faturados contam como deduções
        if (
          ['65', 'PA', '55'].includes(v.modelo) &&
          (v.status === 'C' || v.tipoMovimento === 'E')
        ) {
          deducoes += Math.abs(Number(v.valTotal) || 0)
        }
        continue
      }
      const val = Number(v.valTotal) || 0
      if (val > 0) {
        receitaBruta += val
        const custo = v.custoTotal != null ? Number(v.custoTotal) : 0
        cmv += Math.max(0, custo)
      }
    }

    const receitaLiquida = moeda(receitaBruta - deducoes)
    const lucroBruto = moeda(receitaLiquida - cmv)

    // 2. Coleta Despesas do Plano de Contas (Upstream /dre/v1 do ERP + Contas Baixadas DB)
    const mapaPlanoContas = new Map<string, number>()

    // Consulta upstream /dre/v1 para as lojas com token ativo
    const lojasValidas = lojasComToken ? lojasComToken.filter((l) => Boolean(l.erpToken)) : []
    await Promise.all(
      lojasValidas.map(async (loja) => {
        try {
          const dreUpstream = await this.upstream.get<any>(
            '/dre/v1',
            { dataInicio: inicioIso, dataFim: fimIso },
            loja.erpToken!,
          )

          if (dreUpstream && Array.isArray(dreUpstream.linhas)) {
            for (const l of dreUpstream.linhas) {
              const valor = l.periodos && l.periodos[0] ? Number(l.periodos[0].valor) || 0 : 0
              if (valor <= 0) continue

              const tipo = String(l.detalheTipo || '')
              const desc = String(l.descricao || '')

              // Identifica linhas que compõem custos fixos, operacionais ou outras despesas do plano de contas
              const ehDespesaPlano =
                tipo.includes('CUSTOS_FIXOS_DRE') ||
                tipo.includes('OUTRAS_DESPESAS_DRE') ||
                tipo.includes('DESPESA') ||
                (l.principal === false && (l.idGrupoDre === 3 || l.idGrupoDre === 6))

              if (ehDespesaPlano) {
                const chave = limparDescricaoPlano(desc).toUpperCase()
                if (chave) {
                  mapaPlanoContas.set(chave, (mapaPlanoContas.get(chave) ?? 0) + valor)
                }
              }
            }
          }
        } catch (e) {
          this.logger.warn(`Falha ao obter DRE upstream da loja ${loja.id}: ${(e as Error).message}`)
        }
      }),
    )

    // Incorpora contas a pagar baixadas/liquidadas salvas no banco
    for (const c of contasPagarDb) {
      // Considera liquidada se aindaPendente === false ou valPago > 0
      const pago = Number(c.valPago) || 0
      const origem = Number(c.valOrigem) || 0
      const valorLiquidado = pago > 0 ? pago : (!c.aindaPendente ? origem : 0)

      if (valorLiquidado > 0) {
        const desc = limparDescricaoPlano(c.descricao || 'Outras Despesas').toUpperCase()
        if (desc) {
          // Se já veio da API upstream, preserva o valor da API ou soma se for conta adicional
          if (!mapaPlanoContas.has(desc)) {
            mapaPlanoContas.set(desc, (mapaPlanoContas.get(desc) ?? 0) + valorLiquidado)
          }
        }
      }
    }

    // Se nenhuma despesa detalhada foi encontrada no plano, mas existem contas a pagar com saldo/origem
    if (mapaPlanoContas.size === 0 && contasPagarDb.length > 0) {
      for (const c of contasPagarDb) {
        const val = Number(c.valPago) || Number(c.valOrigem) || 0
        if (val > 0) {
          const desc = limparDescricaoPlano(c.descricao || 'Despesas Gerais').toUpperCase()
          mapaPlanoContas.set(desc, (mapaPlanoContas.get(desc) ?? 0) + val)
        }
      }
    }

    let despesas = 0
    const despesasPlanoContas: Array<{ descricao: string; valor: number }> = []

    for (const [descricao, valor] of mapaPlanoContas.entries()) {
      const v = moeda(valor)
      despesas += v
      despesasPlanoContas.push({ descricao, valor: v })
    }

    despesas = moeda(despesas)
    const resultadoLiquido = moeda(lucroBruto - despesas)

    return {
      receitaBruta: moeda(receitaBruta),
      deducoes: moeda(deducoes),
      receitaLiquida,
      cmv: moeda(cmv),
      lucroBruto,
      despesas,
      resultadoLiquido,
      despesasPlanoContas,
    }
  }
}
