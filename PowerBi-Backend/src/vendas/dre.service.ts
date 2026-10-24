import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import { isVendaValida } from './venda-valida.util'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

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
  linhas: LinhaDre[]
}

const moeda = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

@Injectable()
export class DreService {
  constructor(private readonly prisma: PrismaService) {}

  async calcular(
    inicio: string,
    fim: string,
    inicioAnterior?: string,
    fimAnterior?: string,
    idsLojas = '',
    usuario?: UsuarioToken,
  ): Promise<DreResultadoDto> {
    const ids = escopoLojas(usuario, idsLojas)

    // Se período anterior não foi informado, calcula período de mesmo tamanho imediatamente anterior
    const dtInicio = new Date(`${inicio}T00:00:00.000Z`)
    const dtFim = new Date(`${fim}T23:59:59.999Z`)
    const diffDias = Math.max(1, Math.round((dtFim.getTime() - dtInicio.getTime()) / (1000 * 60 * 60 * 24)))

    const dtInicioAnt = inicioAnterior
      ? new Date(`${inicioAnterior}T00:00:00.000Z`)
      : new Date(dtInicio.getTime() - diffDias * 86400000)
    const dtFimAnt = fimAnterior
      ? new Date(`${fimAnterior}T23:59:59.999Z`)
      : new Date(dtInicio.getTime() - 1)

    const [dadosAtual, dadosAnt] = await Promise.all([
      this.coletarPeriodo(dtInicio, dtFim, ids),
      this.coletarPeriodo(dtInicioAnt, dtFimAnt, ids),
    ])

    const montarLinha = (
      codigo: string,
      descricao: string,
      tipo: LinhaDre['tipo'],
      vAtual: number,
      vAnt: number,
      recLiqAtual: number,
      recLiqAnt: number,
      destaque = false,
    ): LinhaDre => {
      const vAt = moeda(vAtual)
      const vAn = moeda(vAnt)
      const varNom = moeda(vAt - vAn)
      const varPerc = vAn !== 0 ? Math.round(((vAt - vAn) / Math.abs(vAn)) * 10000) / 100 : 0
      const avAtual = recLiqAtual > 0 ? Math.round((vAt / recLiqAtual) * 10000) / 100 : 0
      const avAnt = recLiqAnt > 0 ? Math.round((vAn / recLiqAnt) * 10000) / 100 : 0

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

    const rlAtual = dadosAtual.receitaLiquida
    const rlAnt = dadosAnt.receitaLiquida

    const linhas: LinhaDre[] = [
      montarLinha('1', '1. Receita Bruta de Vendas', 'RECEITA', dadosAtual.receitaBruta, dadosAnt.receitaBruta, rlAtual, rlAnt, true),
      montarLinha('1.1', '(-) Deduções, Devoluções e Cancelamentos', 'DEDUCAO', -Math.abs(dadosAtual.deducoes), -Math.abs(dadosAnt.deducoes), rlAtual, rlAnt),
      montarLinha('2', '(=) Receita Líquida de Vendas', 'SUBTOTAL', dadosAtual.receitaLiquida, dadosAnt.receitaLiquida, rlAtual, rlAnt, true),
      montarLinha('2.1', '(-) Custos dos Produtos Vendidos (CMV)', 'CUSTO', -Math.abs(dadosAtual.cmv), -Math.abs(dadosAnt.cmv), rlAtual, rlAnt),
      montarLinha('3', '(=) Lucro Bruto (Margem de Contribuição)', 'SUBTOTAL', dadosAtual.lucroBruto, dadosAnt.lucroBruto, rlAtual, rlAnt, true),
      montarLinha('3.1', '(-) Despesas Operacionais e Administrativas', 'DESPESA', -Math.abs(dadosAtual.despesas), -Math.abs(dadosAnt.despesas), rlAtual, rlAnt),
      montarLinha('4', '(=) Resultado Líquido do Período', 'RESULTADO', dadosAtual.resultadoLiquido, dadosAnt.resultadoLiquido, rlAtual, rlAnt, true),
    ]

    return {
      periodoAtual: { inicio, fim },
      periodoAnterior: {
        inicio: dtInicioAnt.toISOString().slice(0, 10),
        fim: dtFimAnt.toISOString().slice(0, 10),
      },
      kpis: {
        receitaLiquida: dadosAtual.receitaLiquida,
        lucroBruto: dadosAtual.lucroBruto,
        margemBruta: rlAtual > 0 ? Math.round((dadosAtual.lucroBruto / rlAtual) * 10000) / 100 : 0,
        despesasOperacionais: dadosAtual.despesas,
        resultadoLiquido: dadosAtual.resultadoLiquido,
        margemLiquida: rlAtual > 0 ? Math.round((dadosAtual.resultadoLiquido / rlAtual) * 10000) / 100 : 0,
      },
      linhas,
    }
  }

  private async coletarPeriodo(inicio: Date, fim: Date, idsLojas?: string[]) {
    const whereLoja = idsLojas && idsLojas.length > 0 ? { idLoja: { in: idsLojas } } : {}

    const [vendas, despesasRaw] = await Promise.all([
      this.prisma.venda.findMany({
        where: {
          data: { gte: inicio, lte: fim },
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
          dtVencimento: { gte: inicio, lte: fim },
          ...whereLoja,
        },
        select: {
          valOrigem: true,
          valPago: true,
          valSaldo: true,
          aindaPendente: true,
        },
      }),
    ])

    let receitaBruta = 0
    let deducoes = 0
    let cmv = 0

    for (const v of vendas) {
      if (!isVendaValida(v)) {
        if (v.status === 'C' || v.tipoMovimento === 'E') {
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

    // Despesas operacionais a pagar / pagas no período
    let despesas = 0
    for (const d of despesasRaw) {
      const pago = Number(d.valPago) || 0
      const origem = Number(d.valOrigem) || 0
      despesas += pago > 0 ? pago : origem
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
    }
  }
}
