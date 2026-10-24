import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CACHE_ENTIDADES } from '../redis/cache-entidades'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { dateParaDiaIso, diaIsoParaDate, limitesDoDiaParaErp } from '../common/utils/date.util'
import { validarIntervaloDentroDaJanela } from '../common/utils/janela.util'
import { mapComissao, type ComissaoRaw } from './comissao.mapper'
import type { ComissaoResponseDto } from './dto/comissao-response.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class ComissoesService {
  private readonly logger = new Logger(ComissoesService.name)
  private readonly janelaDias: number
  private idLojaPadrao: string | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly upstream: MeuErpOnlineClient,
    private readonly config: ConfigService,
  ) {
    this.janelaDias = this.config.get<number>('SYNC_WINDOW_PADRAO_DIAS') ?? 90
  }

  private async getIdLojaPadrao(): Promise<string> {
    if (this.idLojaPadrao) return this.idLojaPadrao
    const loja = this.prisma.loja ? await this.prisma.loja.findFirst() : null
    this.idLojaPadrao = loja?.id ?? 'loja-inhuma'
    return this.idLojaPadrao
  }

  /**
   * `funcionario/comissoes/v1` devolve **um item por documento** (venda), não já somado por
   * funcionário/dia. Agrega em memória por `nomeFuncionario` antes de gravar.
   */
  async sincronizarDia(dia: Date, idLoja?: string, token?: string): Promise<number> {
    const diaIso = dateParaDiaIso(dia)
    const { inicio, fim } = limitesDoDiaParaErp(diaIso)
    const lojaId = idLoja ?? (await this.getIdLojaPadrao())

    const itens = await this.upstream.getAllPages<ReturnType<typeof mapComissao>, ComissaoRaw>(
      '/funcionario/comissoes/v1',
      { dataInicio: inicio, dataFim: fim, limit: 100 },
      mapComissao,
      token,
    )


    const somaPorFuncionario = new Map<string, ReturnType<typeof mapComissao>>()
    for (const item of itens) {
      const atual = somaPorFuncionario.get(item.nomeFuncionario)
      if (atual) {
        atual.valTotalLiquido += item.valTotalLiquido
        atual.valTotalComissao += item.valTotalComissao
      } else {
        somaPorFuncionario.set(item.nomeFuncionario, { ...item })
      }
    }

    const porFuncionario = Array.from(somaPorFuncionario.values())

    await this.prisma.$transaction([
      this.prisma.comissaoDia.updateMany({
        where: { idLoja: lojaId, data: dia, nomeFuncionario: { notIn: porFuncionario.map((item) => item.nomeFuncionario) } },
        data: { valTotalLiquido: 0, valTotalComissao: 0 },
      }),
      ...porFuncionario.map((item) =>
        this.prisma.comissaoDia.upsert({
          where: {
            idLoja_data_nomeFuncionario: {
              idLoja: lojaId,
              data: dia,
              nomeFuncionario: item.nomeFuncionario,
            },
          },
          create: { idLoja: lojaId, data: dia, ...item },
          update: { valTotalLiquido: item.valTotalLiquido, valTotalComissao: item.valTotalComissao },
        }),
      ),
    ])

    this.logger.log(
      `Comissões: ${itens.length} documento(s) somados em ${porFuncionario.length} funcionário(s) para ${diaIso} (loja: ${lojaId}).`,
    )
    return porFuncionario.length
  }

  /**
   * Retenção pendente de validação com Fernando e Tony.
   * Exclusão automática desativada para preservar a integridade do histórico contábil coletado.
   */
  async expirarAntesDe(_dataCorte: Date, _idLoja?: string): Promise<number> {
    return 0
  }

  async listarPeriodo(
    inicio: string,
    fim: string,
    idLoja?: string,
    usuario?: UsuarioToken,
    idsLojas?: string,
  ): Promise<ComissaoResponseDto[]> {
    const dataInicio = diaIsoParaDate(inicio)
    const dataFim = diaIsoParaDate(fim)
    validarIntervaloDentroDaJanela(dataInicio, dataFim, this.janelaDias)

    let lojasFiltro: string[] | undefined
    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (idLoja && idLoja !== 'todas') {
        if (!usuario.lojas.includes(idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar os dados desta unidade.')
        }
        lojasFiltro = [idLoja]
      } else {
        lojasFiltro = usuario.lojas
      }
    } else if (idLoja && idLoja !== 'todas') {
      if (this.prisma?.loja?.findUnique) {
        const lojaExiste = await this.prisma.loja.findUnique({ where: { id: idLoja } })
        if (!lojaExiste) {
          throw new NotFoundException(`Unidade com id '${idLoja}' não encontrada.`)
        }
      }
      lojasFiltro = [idLoja]
    }

    const selecionadas = [...new Set((idsLojas ?? '').split(',').map((id) => id.trim()).filter(Boolean))]
    if (selecionadas.length) {
      if (usuario?.perfil === 'FRANQUEADO' && selecionadas.some((id) => !usuario.lojas.includes(id))) {
        throw new ForbiddenException('Você não tem permissão para acessar os dados desta unidade.')
      }
      lojasFiltro = selecionadas
    }

    const escopoLoja = lojasFiltro ? lojasFiltro.slice().sort().join('_') : 'todas'
    const chave = await this.redis.chaveComGeracao(
      CACHE_ENTIDADES.COMISSAO,
      `${inicio}:${fim}:${escopoLoja}`,
    )
    return this.redis.getOrSet(chave, () => this.somarPeriodoDoPostgres(dataInicio, dataFim, lojasFiltro))
  }

  private async somarPeriodoDoPostgres(
    dataInicio: Date,
    dataFim: Date,
    lojasFiltro?: string[],
  ): Promise<ComissaoResponseDto[]> {
    const where: any = { data: { gte: dataInicio, lte: dataFim } }
    if (lojasFiltro && lojasFiltro.length > 0) {
      where.idLoja = { in: lojasFiltro }
    }

    const somas = await this.prisma.comissaoDia.groupBy({
      by: ['nomeFuncionario'],
      where,
      _sum: { valTotalLiquido: true, valTotalComissao: true },
    })

    return somas
      .map((s) => ({
        nomeFuncionario: s.nomeFuncionario,
        valTotalLiquido: Number(s._sum.valTotalLiquido ?? 0),
        valTotalComissao: Number(s._sum.valTotalComissao ?? 0),
      }))
      .sort((a, b) => b.valTotalLiquido - a.valTotalLiquido)
  }
}
