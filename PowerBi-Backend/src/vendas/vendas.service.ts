import { Prisma } from '@prisma/client'
import { escopoLojas } from '../common/utils/escopo-lojas.util'
import { resumirVendedores } from './vendedores-venda'
import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CACHE_ENTIDADES } from '../redis/cache-entidades'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { dateParaDiaIso, limitesDoDiaParaErp, hojeSaoPaulo } from '../common/utils/date.util'
import { validarIntervaloDentroDaJanela } from '../common/utils/janela.util'
import { mapVenda, type VendaRaw } from './venda.mapper'
import { isVendaValida } from './venda-valida.util'
import type { VendaResponseDto } from './dto/venda-response.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import { resumirVendas, type ResumoVendas } from './resumo-vendas'

@Injectable()
export class VendasService {
  private readonly logger = new Logger(VendasService.name)
  private readonly janelaDias: number
  private idLojaPadrao: string | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly upstream: MeuErpOnlineClient,
    private readonly config: ConfigService,
  ) {
    this.janelaDias = this.config.get<number>('SYNC_WINDOW_FATURAMENTO_DIAS') ?? 365
  }

  private async getIdLojaPadrao(): Promise<string> {
    if (this.idLojaPadrao) return this.idLojaPadrao
    const loja = this.prisma.loja ? await this.prisma.loja.findFirst() : null
    this.idLojaPadrao = loja?.id ?? 'loja-inhuma'
    return this.idLojaPadrao
  }

  /**
   * Sincroniza um único dia: busca `documento/v1` com `DataInicio`/`DataFim` cobrindo o dia
   * inteiro (a única granularidade que faz sentido pro rolamento diário da janela — ver seção
   * 2.1 do prompt de geração deste backend) e faz upsert por `codigo`. Guarda TODOS os modelos
   * com fidelidade bruta (não só `MODELOS_VENDA`) — `isVendaValida` filtra na leitura, não na
   * gravação. Retorna quantos documentos foram processados.
   */
  async sincronizarDia(dia: Date, idLoja?: string, token?: string): Promise<number> {
    const diaIso = dateParaDiaIso(dia)
    const { inicio, fim } = limitesDoDiaParaErp(diaIso)
    const lojaId = idLoja ?? (await this.getIdLojaPadrao())

    const brutos = await this.upstream.getAllPages<ReturnType<typeof mapVenda>, VendaRaw>(
      '/documento/v1',
      { DataInicio: inicio, DataFim: fim, limit: 100 },
      mapVenda,
      token,
    )

    if (brutos.length === 0) return 0

    await this.prisma.$transaction(
      brutos.map((v) => {
        // Para Inhuma (legado), preserva a chave primária existente.
        // Para qualquer outra unidade, prefixa com idLoja para evitar colisões entre empresas no ERP.
        const codigoFinal = lojaId === 'loja-inhuma' ? v.codigo : `${lojaId}_${v.codigo}`
        return this.prisma.venda.upsert({
          where: { codigo: codigoFinal },
          create: {
            codigo: codigoFinal,
            numero: v.numero,
            serie: v.serie,
            modelo: v.modelo,
            modeloDescricao: v.modeloDescricao,
            dataHora: v.dataHora,
            dataHoraMovimento: v.dataHoraMovimento,
            data: v.data,
            idCaixa: v.idCaixa,
            idLoja: lojaId,
            valTotal: v.valTotal,
            custoTotal: v.custoTotal,
            tipoMovimento: v.tipoMovimento,
            tipoMovimentoDescricao: v.tipoMovimentoDescricao,
            tipoMovimentoFinanceiro: v.tipoMovimentoFinanceiro,
            status: v.status,
            statusDescricao: v.statusDescricao,
            nomeUsuario: v.nomeUsuario,
            ...(v.vendedores !== undefined ? { vendedores: v.vendedores as unknown as Prisma.InputJsonValue } : {}),
            pagamentos: { create: v.pagamentos },
          },
          update: {
            numero: v.numero,
            serie: v.serie,
            modelo: v.modelo,
            modeloDescricao: v.modeloDescricao,
            dataHora: v.dataHora,
            dataHoraMovimento: v.dataHoraMovimento,
            data: v.data,
            idCaixa: v.idCaixa,
            idLoja: lojaId,
            valTotal: v.valTotal,
            custoTotal: v.custoTotal,
            tipoMovimento: v.tipoMovimento,
            tipoMovimentoDescricao: v.tipoMovimentoDescricao,
            tipoMovimentoFinanceiro: v.tipoMovimentoFinanceiro,
            status: v.status,
            statusDescricao: v.statusDescricao,
            nomeUsuario: v.nomeUsuario,
            ...(v.vendedores !== undefined ? { vendedores: v.vendedores as unknown as Prisma.InputJsonValue } : {}),
            pagamentos: { deleteMany: {}, create: v.pagamentos },
          },
        })
      }),
    )

    this.logger.log(`Vendas: ${brutos.length} documento(s) sincronizado(s) para ${diaIso} (loja: ${lojaId}).`)
    return brutos.length
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
    idCaixa?: string,
    idLoja?: string,
    usuario?: UsuarioToken,
  ): Promise<VendaResponseDto[]> {
    const dataInicio = new Date(`${inicio}T00:00:00.000Z`)
    const dataFim = new Date(`${fim}T00:00:00.000Z`)
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

    const escopoLoja = lojasFiltro ? lojasFiltro.slice().sort().join('_') : 'todas'

    // Cacheada por geração no Redis. O escopo da loja isola totalmente o cache evitando vazamentos.
    const chave = await this.redis.chaveComGeracao(
      CACHE_ENTIDADES.VENDA,
      `custos-reais-v2:${inicio}:${fim}:${idCaixa ?? 'todos'}:${escopoLoja}`,
    )
    return this.redis.getOrSet(chave, () => this.buscarPeriodoDoPostgres(dataInicio, dataFim, idCaixa, lojasFiltro))
  }

  async vendedoresPeriodo(inicio: string, fim: string, idsLojas = '', idCaixa?: string, usuario?: UsuarioToken) {
    const ids = escopoLojas(usuario, idsLojas)
    const dataInicio = new Date(inicio + 'T00:00:00.000Z')
    const dataFim = new Date(fim + 'T00:00:00.000Z')
    validarIntervaloDentroDaJanela(dataInicio, dataFim, this.janelaDias)
    const chave = await this.redis.chaveComGeracao(CACHE_ENTIDADES.VENDA,
      ['vendedores-itens-v2', inicio, fim, ids?.slice().sort().join(',') ?? 'todas', idCaixa ?? 'todos'].join(':'))
    return this.redis.getOrSet(chave, async () => {
      const vendas = await this.prisma.venda.findMany({
        where: { data: { gte: dataInicio, lte: dataFim }, tipoMovimento: 'S', tipoMovimentoFinanceiro: 'R',
          valTotal: { gt: 0 }, ...(ids ? { idLoja: { in: ids } } : {}),
          ...(idCaixa && idCaixa !== 'todos' ? { idCaixa } : {}) },
        select: { codigo: true, modelo: true, idLoja: true, valTotal: true, tipoMovimento: true, tipoMovimentoFinanceiro: true,
          status: true, statusDescricao: true, vendedores: true, loja: { select: { nome: true } } },
      })
      return resumirVendedores(vendas)
    })
  }

  async resumoPeriodo(
    inicio: string,
    fim: string,
    idsLojas = '',
    idCaixa?: string,
    usuario?: UsuarioToken,
  ): Promise<ResumoVendas> {
    const selecionadas = [...new Set(idsLojas.split(',').map((id) => id.trim()).filter(Boolean))].sort()
    const escopoUsuario = usuario?.perfil === 'FRANQUEADO'
      ? 'franqueado:' + (usuario.lojas ?? []).slice().sort().join(',')
      : 'admin'
    // Resposta compacta em cache por geração: a sincronização invalida o mesmo contador das
    // vendas, e o escopo atual do usuário impede compartilhar dados entre franquias.
    const chave = await this.redis.chaveComGeracao(
      CACHE_ENTIDADES.VENDA,
      ['resumo-custos-reais-v2', dateParaDiaIso(hojeSaoPaulo()), inicio, fim, selecionadas.join(','), idCaixa ?? 'todos', escopoUsuario].join(':'),
    )
    return this.redis.getOrSet(chave, async () => {
      const vendas = await this.listarPeriodo(inicio, fim, undefined, undefined, usuario)
      return resumirVendas(vendas, selecionadas, idCaixa)
    })
  }

  async listarPagina(
    inicio: string,
    fim: string,
    page: number,
    pageSize: number,
    busca = '',
    sort = 'dataHora',
    direcao = 'desc',
    idsLojas = '',
    idCaixa?: string,
    usuario?: UsuarioToken,
  ): Promise<{ items: VendaResponseDto[]; total: number; page: number; pageSize: number }> {
    const vendas = await this.listarPeriodo(inicio, fim, undefined, undefined, usuario)
    const selecionadas = idsLojas.split(',').map((id) => id.trim()).filter(Boolean)
    const termo = busca.trim().toLocaleLowerCase()
    const filtradas = vendas.filter((v) =>
      Number.isFinite(v.valTotal) && (v.valTotal ?? 0) > 0 && !['PV', 'PP', 'TR'].includes(v.modelo) &&
      (selecionadas.length === 0 || Boolean(v.idLoja && selecionadas.includes(v.idLoja))) &&
      (!idCaixa || idCaixa === 'todos' || v.idCaixa === idCaixa) &&
      (!termo || v.numero.toLocaleLowerCase().includes(termo) || v.nomeUsuario.toLocaleLowerCase().includes(termo)),
    )
    const fator = direcao === 'asc' ? 1 : -1
    filtradas.sort((a, b) =>
      sort === 'valTotal'
        ? ((a.valTotal ?? 0) - (b.valTotal ?? 0)) * fator
        : a.dataHora.localeCompare(b.dataHora) * fator,
    )
    return {
      items: filtradas.slice((page - 1) * pageSize, page * pageSize),
      total: filtradas.length,
      page,
      pageSize,
    }
  }

  private async buscarPeriodoDoPostgres(
    dataInicio: Date,
    dataFim: Date,
    idCaixa?: string,
    lojasFiltro?: string[],
  ): Promise<VendaResponseDto[]> {
    const where: any = {
      data: { gte: dataInicio, lte: dataFim },
      idCaixa,
      tipoMovimento: 'S',
      tipoMovimentoFinanceiro: 'R',
      valTotal: { not: null },
    }

    if (lojasFiltro && lojasFiltro.length > 0) {
      where.idLoja = { in: lojasFiltro }
    }

    const linhas = await this.prisma.venda.findMany({
      where,
      include: { pagamentos: true, loja: true },
      orderBy: { dataHora: 'desc' },
    })

    return linhas
      .filter((v) =>
        isVendaValida({
          modelo: v.modelo,
          valTotal: v.valTotal,
          tipoMovimento: v.tipoMovimento,
          tipoMovimentoFinanceiro: v.tipoMovimentoFinanceiro,
          status: v.status,
          statusDescricao: v.statusDescricao,
        }),
      )
      .map((v) => ({
        codigo: v.codigo,
        numero: v.numero,
        serie: v.serie,
        modelo: v.modelo,
        modeloDescricao: v.modeloDescricao,
        dataHora: v.dataHora,
        dataHoraMovimento: v.dataHoraMovimento,
        idCaixa: v.idCaixa,
        idLoja: v.idLoja,
        nomeLoja: v.loja?.nome ?? null,
        valTotal: v.valTotal === null ? null : Number(v.valTotal),
        custoTotal: v.custoTotal == null ? null : Number(v.custoTotal),
        tipoMovimento: v.tipoMovimento,
        tipoMovimentoDescricao: v.tipoMovimentoDescricao,
        tipoMovimentoFinanceiro: v.tipoMovimentoFinanceiro,
        status: v.status,
        statusDescricao: v.statusDescricao,
        nomeUsuario: v.nomeUsuario,
        pagamentos: v.pagamentos.map((p) => ({
          idPagamento: p.idPagamento,
          descricao: p.descricao,
          valor: Number(p.valor),
        })),
      }))
  }
}
