import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CACHE_ENTIDADES } from '../redis/cache-entidades'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { MODELOS_VENDA } from '../upstream/erp.constants'
import { dateParaDiaIso, diaIsoParaDate, limitesDoDiaParaErp } from '../common/utils/date.util'
import { validarIntervaloDentroDaJanela } from '../common/utils/janela.util'
import { mapItemVendido, type ItemVendidoRaw } from './item-vendido.mapper'
import type { ItemVendidoResponseDto } from './dto/item-vendido-response.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class ItensVendidosService {
  private readonly logger = new Logger(ItensVendidosService.name)
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
   * `mercadorias-vendidas/v1` só devolve o total já somado pro intervalo inteiro pedido — sem
   * campo de data por item (ver seção 2.2 do prompt de geração deste backend). Por isso a
   * ingestão sempre pede o dia inteiro (`DataInicio`/`DataFim` cobrindo `dia`), uma chamada por
   * `modelo` de venda (`Modelo` é obrigatório e só aceita um valor por chamada), somando os dois
   * antes de gravar o bucket do dia — mesma lógica que o front já fazia
   * (`getItensVendidosPeriodo`).
   */
  async sincronizarDia(dia: Date, idLoja?: string, token?: string): Promise<number> {
    const diaIso = dateParaDiaIso(dia)
    const { inicio, fim } = limitesDoDiaParaErp(diaIso)
    const lojaId = idLoja ?? (await this.getIdLojaPadrao())

    const porModelo: ReturnType<typeof mapItemVendido>[][] = []
    for (const modelo of MODELOS_VENDA) {
      const items = await this.upstream.getAllPages<ReturnType<typeof mapItemVendido>, ItemVendidoRaw>(
        '/documento/mercadorias-vendidas/v1',
        { DataInicio: inicio, DataFim: fim, Modelo: modelo, limit: 100 },
        mapItemVendido,
        token,
      )
      porModelo.push(items)
    }

    const somaPorItem = new Map<string, ReturnType<typeof mapItemVendido>>()
    for (const item of porModelo.flat()) {
      const atual = somaPorItem.get(item.idMercadoriaVariacao)
      if (atual) {
        atual.qtd += item.qtd
        atual.valTotalLiquido += item.valTotalLiquido
      } else {
        somaPorItem.set(item.idMercadoriaVariacao, { ...item })
      }
    }

    const itens = Array.from(somaPorItem.values()).map(item => ({ ...item, idMercadoriaVariacao: codigoDaLoja(item.idMercadoriaVariacao, lojaId) }))

    await this.prisma.$transaction([
      this.prisma.itemVendidoDia.updateMany({
        where: { idLoja: lojaId, data: dia, idMercadoriaVariacao: { notIn: itens.map((item) => item.idMercadoriaVariacao) } },
        data: { qtd: 0, valTotalLiquido: 0 },
      }),
      ...itens.map((item) =>
        this.prisma.itemVendidoDia.upsert({
          where: {
            idLoja_data_idMercadoriaVariacao: {
              idLoja: lojaId,
              data: dia,
              idMercadoriaVariacao: item.idMercadoriaVariacao,
            },
          },
          create: { idLoja: lojaId, data: dia, ...item },
          update: { descricao: item.descricao, qtd: item.qtd, valTotalLiquido: item.valTotalLiquido },
        }),
      ),
    ])

    this.logger.log(`Itens vendidos: ${itens.length} produto(s) sincronizado(s) para ${diaIso} (loja: ${lojaId}).`)
    return itens.length
  }

  /**
   * Retenção pendente de validação com Fernando e Tony.
   * Exclusão automática desativada para preservar a integridade do histórico contábil coletado.
   */
  async expirarAntesDe(_dataCorte: Date, _idLoja?: string): Promise<number> {
    return 0
  }

  /** Soma os buckets diários dentro do sub-intervalo pedido — qualquer recorte dentro da janela
   * de 365 dias, sem precisar voltar no ERP (melhoria sobre o comportamento atual do front, que
   * só conseguia um total por chamada de período exato). */
  async listarPeriodo(
    inicio: string,
    fim: string,
    idLoja?: string,
    usuario?: UsuarioToken,
    idsLojas?: string,
  ): Promise<ItemVendidoResponseDto[]> {
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
      CACHE_ENTIDADES.ITEM_VENDIDO,
      `${inicio}:${fim}:${escopoLoja}`,
    )
    return this.redis.getOrSet(chave, () => this.somarPeriodoDoPostgres(dataInicio, dataFim, lojasFiltro))
  }

  private async somarPeriodoDoPostgres(
    dataInicio: Date,
    dataFim: Date,
    lojasFiltro?: string[],
  ): Promise<ItemVendidoResponseDto[]> {
    const where: any = { data: { gte: dataInicio, lte: dataFim } }
    if (lojasFiltro && lojasFiltro.length > 0) {
      where.idLoja = { in: lojasFiltro }
    }

    const [somas, descricoes] = await Promise.all([
      this.prisma.itemVendidoDia.groupBy({
        by: ['idMercadoriaVariacao'],
        where,
        _sum: { qtd: true, valTotalLiquido: true },
      }),
      // Descrição mais recente de cada produto dentro do período — `descricao` é redundante em
      // cada bucket diário de propósito (evita join a `Produto` só pra exibir o nome), mas só
      // uma cópia precisa ser lida na resposta.
      this.prisma.itemVendidoDia.findMany({
        where,
        distinct: ['idMercadoriaVariacao'],
        orderBy: { data: 'desc' },
        select: { idMercadoriaVariacao: true, descricao: true },
      }),
    ])

    const descricaoPorId = new Map(descricoes.map((d) => [d.idMercadoriaVariacao, d.descricao]))

    return somas
      .map((s) => ({
        idMercadoriaVariacao: s.idMercadoriaVariacao,
        descricao: descricaoPorId.get(s.idMercadoriaVariacao) ?? '',
        qtd: Number(s._sum.qtd ?? 0),
        valTotalLiquido: Number(s._sum.valTotalLiquido ?? 0),
      }))
      .sort((a, b) => b.valTotalLiquido - a.valTotalLiquido)
  }
}
