import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron } from '@nestjs/schedule'
import type { EntidadeSync } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CACHE_ENTIDADES } from '../redis/cache-entidades'
import { ErpApiError } from '../upstream/meu-erp-online.client'
import { VendasService } from '../vendas/vendas.service'
import { ItensVendidosService } from '../itens-vendidos/itens-vendidos.service'
import { ComissoesService } from '../comissoes/comissoes.service'
import { ProdutosService } from '../produtos/produtos.service'
import { ClientesService } from '../clientes/clientes.service'
import { FormasPagamentoService } from '../formas-pagamento/formas-pagamento.service'
import { EstoqueService } from '../estoque/estoque.service'
import { EmpresaService } from '../empresa/empresa.service'
import { ContasPendentesService } from '../contas-pendentes/contas-pendentes.service'
import { dateParaDiaIso, hojeSaoPaulo, listarDias, subtrairDias } from '../common/utils/date.util'
import type { SyncStatusResponseDto } from './dto/sync-status-response.dto'

export interface ResultadoSync {
  lojasSincronizadas: string[]
  lojasIgnoradasSemToken: string[]
  totalSucessos: number
  totalFalhas: number
}

interface SincronizadorJanela {
  entidade: EntidadeSync
  janelaDias?: number
  sincronizarDia: (dia: Date, idLoja?: string, token?: string) => Promise<number>
  expirarAntesDe: (corte: Date, idLoja?: string) => Promise<number>
}

interface SincronizadorSnapshot {
  entidade: EntidadeSync
  sincronizar: (idLoja?: string, token?: string) => Promise<number>
}

/** Só as entidades que algum service efetivamente cacheia (ver `RedisService`/`CACHE_ENTIDADES`)
 * — as outras não têm chave de cache pra invalidar, então não há o que avançar. */
const GERACAO_CACHE_POR_ENTIDADE: Partial<Record<EntidadeSync, string>> = {
  VENDA: CACHE_ENTIDADES.VENDA,
  ITEM_VENDIDO: CACHE_ENTIDADES.ITEM_VENDIDO,
  COMISSAO: CACHE_ENTIDADES.COMISSAO,
  ESTOQUE: CACHE_ENTIDADES.ESTOQUE,
}

/** Falha isolada de um dia (rede caiu, ERP deu 5xx, hiccup qualquer) não deveria custar aquele
 * dia inteiro até o próximo cron — tenta de novo antes de desistir e gravar `SyncLog` de erro.
 * Não precisa de backoff próprio: cada tentativa passa de novo pela fila serializada do
 * `MeuErpOnlineClient` (`MIN_INTERVAL_MS`/backoff de 429 dele), então retentar aqui nunca gera
 * uma rajada extra de requisições — só mais uma volta pela mesma fila devagar de sempre. */
const TENTATIVAS_POR_TAREFA = 3
const BACKOFF_ENTRE_TENTATIVAS_MS = 5_000

/**
 * Orquestra a sincronização multiloja — não conhece o schema de nenhuma entidade específica, só chama
 * `sincronizarDia`/`sincronizarSnapshot`/`expirarAntesDe` de cada domínio para cada loja ativa e cuida
 * do que é transversal: descobrir quais dias faltam por loja, gravar `SyncLog` com `idLoja`,
 * e nunca deixar a falha de uma loja ou entidade afetar as demais.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)
  private readonly janelaDias: number
  private ultimoCicloDiario = ''
  private verificarTrava: () => void = () => {}
  private readonly sincronizadoresJanela: SincronizadorJanela[]
  private readonly sincronizadoresSnapshot: SincronizadorSnapshot[]

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    vendasService: VendasService,
    itensVendidosService: ItensVendidosService,
    comissoesService: ComissoesService,
    produtosService: ProdutosService,
    clientesService: ClientesService,
    formasPagamentoService: FormasPagamentoService,
    estoqueService: EstoqueService,
    empresaService: EmpresaService,
    contasPendentesService: ContasPendentesService,
  ) {
    this.janelaDias = this.config.get<number>('SYNC_WINDOW_PADRAO_DIAS') ?? 90

    const janelaFaturamento = this.config.get<number>('SYNC_WINDOW_FATURAMENTO_DIAS') ?? 365
    const janelaPadrao = this.config.get<number>('SYNC_WINDOW_PADRAO_DIAS') ?? 90

    this.sincronizadoresJanela = [
      {
        entidade: 'VENDA',
        janelaDias: janelaFaturamento,
        sincronizarDia: (dia, idLoja, token) => vendasService.sincronizarDia(dia, idLoja, token),
        expirarAntesDe: (corte, idLoja) => vendasService.expirarAntesDe(corte, idLoja),
      },
      {
        entidade: 'ITEM_VENDIDO',
        janelaDias: janelaPadrao,
        sincronizarDia: (dia, idLoja, token) => itensVendidosService.sincronizarDia(dia, idLoja, token),
        expirarAntesDe: (corte, idLoja) => itensVendidosService.expirarAntesDe(corte, idLoja),
      },
      {
        entidade: 'COMISSAO',
        janelaDias: janelaPadrao,
        sincronizarDia: (dia, idLoja, token) => comissoesService.sincronizarDia(dia, idLoja, token),
        expirarAntesDe: (corte, idLoja) => comissoesService.expirarAntesDe(corte, idLoja),
      },
    ]

    this.sincronizadoresSnapshot = [
      { entidade: 'PRODUTO', sincronizar: (idLoja, token) => produtosService.sincronizarSnapshot(idLoja, token) },
      { entidade: 'PESSOA', sincronizar: (idLoja, token) => clientesService.sincronizarSnapshot(idLoja, token) },
      { entidade: 'FORMA_PAGAMENTO', sincronizar: (idLoja, token) => formasPagamentoService.sincronizarSnapshot(idLoja, token) },
      { entidade: 'ESTOQUE', sincronizar: (idLoja, token) => estoqueService.sincronizarSnapshot(idLoja, token) },
      { entidade: 'EMPRESA', sincronizar: (idLoja, token) => empresaService.sincronizarSnapshot(idLoja, token) },
      { entidade: 'CONTA_RECEBER', sincronizar: (idLoja, token) => contasPendentesService.sincronizarSnapshot('RECEBER', idLoja, token) },
      { entidade: 'CONTA_PAGAR', sincronizar: (idLoja, token) => contasPendentesService.sincronizarSnapshot('PAGAR', idLoja, token) },
    ]
  }

  private async exclusivo<T>(tarefa: () => Promise<T>): Promise<T | undefined> {
    return this.redis.executarSyncExclusivo(async (verificar) => {
      this.verificarTrava = verificar
      try { return await tarefa() } finally { this.verificarTrava = () => {} }
    })
  }

  /** Dez minutos: somente movimentos de hoje, sem reimportar o histórico. */
  @Cron('*/10 * * * *', { name: 'ciclo-intradiario', timeZone: 'America/Sao_Paulo' })
  async executarCicloIntradiario(): Promise<void> {
    const resultado = await this.exclusivo(() => this.sincronizarDiasRecentes([hojeSaoPaulo()]))
    if (!resultado) this.logger.log('Ciclo intradiário adiado: outra sincronização está em andamento.')
  }

  /** Dez minutos: saldos e fiado, cinco minutos após vendas para evitar disputa pela trava. */
  @Cron('5,15,25,35,45,55 * * * *', { name: 'ciclo-estoque-receber', timeZone: 'America/Sao_Paulo' })
  async executarCicloEstoqueReceber(): Promise<void> {
    const resultado = await this.sincronizarOperacional()
    if (!resultado) this.logger.log('Atualização de estoque/receber adiada: outra sincronização está em andamento.')
  }

  async sincronizarOperacional(idLojaAlvo?: string): Promise<ResultadoSync | undefined> {
    return this.exclusivo(() => this.sincronizarSnapshotsInterno(idLojaAlvo, ['PRODUTO', 'PESSOA', 'ESTOQUE', 'CONTA_RECEBER', 'CONTA_PAGAR']))
  }

  /** Tentativas na janela das 03h, uma execução concluída por dia. */
  @Cron('5,15,25,35,45,55 3 * * *', { name: 'ciclo-diario', timeZone: 'America/Sao_Paulo' })
  async executarCicloDiario(): Promise<void> {
    const hoje = hojeSaoPaulo()
    const dia = dateParaDiaIso(hoje)
    if (this.ultimoCicloDiario === dia) return
    await this.exclusivo(async () => {
      const recentes = await this.sincronizarDiasRecentes([subtrairDias(hoje, 1)])
      const janela = await this.sincronizarJanelaInterna()
      const snapshots = await this.sincronizarSnapshotsInterno()
      if (recentes.totalFalhas + janela.totalFalhas + snapshots.totalFalhas === 0) {
        this.ultimoCicloDiario = dia
      }
      this.logger.log('Reconciliação diária concluída.')
    })
  }

  private async sincronizarDiasRecentes(dias: Date[]): Promise<ResultadoSync> {
    const resultado: ResultadoSync = {
      lojasSincronizadas: [], lojasIgnoradasSemToken: [], totalSucessos: 0, totalFalhas: 0,
    }
    const lojas = await this.prisma.loja.findMany({ where: { ativo: true } })
    for (const loja of lojas) {
      this.verificarTrava()
      const token = loja.erpToken || (loja.id === 'loja-inhuma' || loja.codigo === 'inhuma'
        ? this.config.get<string>('ERP_API_TOKEN') : null)
      if (!token) { resultado.lojasIgnoradasSemToken.push(loja.nome); continue }
      resultado.lojasSincronizadas.push(loja.nome)
      for (const dia of dias) {
        for (const sincronizador of this.sincronizadoresJanela) {
          this.verificarTrava()
          const ok = await this.executarComLog(sincronizador.entidade, dia, loja.id,
            () => sincronizador.sincronizarDia(dia, loja.id, token))
          if (ok) resultado.totalSucessos++
          else resultado.totalFalhas++
        }
      }
    }
    return resultado
  }

  async sincronizarJanela(idLojaAlvo?: string): Promise<ResultadoSync> {
    const resultado = await this.exclusivo(() => this.sincronizarJanelaInterna(idLojaAlvo))
    if (!resultado) throw new Error('Outra sincronização está em andamento; tente novamente mais tarde.')
    return resultado
  }

  async sincronizarSnapshots(idLojaAlvo?: string): Promise<ResultadoSync> {
    const resultado = await this.exclusivo(() => this.sincronizarSnapshotsInterno(idLojaAlvo))
    if (!resultado) throw new Error('Outra sincronização está em andamento; tente novamente mais tarde.')
    return resultado
  }

  /**
   * Preenche todo dia da janela para cada loja ativa configurada com credencial de ERP.
   * Totalmente idempotente e isolado por loja.
   */
  private async sincronizarJanelaInterna(idLojaAlvo?: string): Promise<ResultadoSync> {
    const hoje = hojeSaoPaulo()
    let lojas = this.prisma.loja ? await this.prisma.loja.findMany({ where: { ativo: true } }) : []

    if (idLojaAlvo) {
      lojas = lojas.filter((l) => l.id === idLojaAlvo || l.codigo === idLojaAlvo)
    }

    if (!idLojaAlvo && lojas.length === 0) {
      lojas = [
        {
          id: 'loja-inhuma',
          nome: 'Açaí Senses - Inhuma',
          codigo: 'inhuma',
          cnpj: '51572389000180',
          cidade: 'Inhuma',
          uf: 'PI',
          ativo: true,
          erpToken: null,
          idEmpresaErp: 1,
          idOrganizacao: '',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ]
    }

    const resultado: ResultadoSync = {
      lojasSincronizadas: [],
      lojasIgnoradasSemToken: [],
      totalSucessos: 0,
      totalFalhas: 0,
    }

    for (const loja of lojas) {
      const token =
        loja.erpToken ||
        (loja.id === 'loja-inhuma' || loja.codigo === 'inhuma'
          ? this.config.get<string>('ERP_API_TOKEN')
          : null)

      if (!token) {
        this.logger.log(
          `SyncService: Loja "${loja.nome}" (${loja.codigo}) não possui erpToken configurado — ignorada na sincronização (aguardando credencial de acesso).`,
        )
        resultado.lojasIgnoradasSemToken.push(loja.nome)
        continue
      }

      this.logger.log(`Iniciando sincronização da janela para a loja "${loja.nome}" (${loja.id}).`)
      resultado.lojasSincronizadas.push(loja.nome)

      for (const sincronizador of this.sincronizadoresJanela) {
        const janelaEntidade = sincronizador.janelaDias ?? this.janelaDias
        const inicio = subtrairDias(hoje, janelaEntidade)
        const ultimoDiaFechado = subtrairDias(hoje, 1)
        const dias = listarDias(inicio, ultimoDiaFechado)

        const jaSincronizados = await this.diasComSucesso(sincronizador.entidade, inicio, ultimoDiaFechado, loja.id)
        const pendentes = dias
          .filter((d) => !jaSincronizados.has(dateParaDiaIso(d)))
          .sort((a, b) => b.getTime() - a.getTime())

        if (pendentes.length > 0) {
          this.logger.log(
            `${sincronizador.entidade} [${loja.nome}]: ${pendentes.length}/${dias.length} dia(s) pendente(s) (janela: ${janelaEntidade} dias).`,
          )
          for (const dia of pendentes) {
            const ok = await this.executarComLog(sincronizador.entidade, dia, loja.id, () =>
              sincronizador.sincronizarDia(dia, loja.id, token),
            )
            if (ok) {
              resultado.totalSucessos++
            } else {
              resultado.totalFalhas++
            }
          }
        }

        // RETENÇÃO: Pendente de validação com Fernando e Tony.
        // A exclusão automática está desativada nos domínios para preservar 100% do histórico coletado.
        const dataCorte = subtrairDias(hoje, janelaEntidade)
        try {
          await sincronizador.expirarAntesDe(dataCorte, loja.id)
        } catch (erro) {
          this.logger.error(
            `Falha expirando ${sincronizador.entidade} da loja ${loja.nome}`,
            erro instanceof Error ? erro.stack : erro,
          )
        }
      }
    }

    return resultado
  }

  private async sincronizarSnapshotsInterno(idLojaAlvo?: string, entidades?: EntidadeSync[]): Promise<ResultadoSync> {
    let lojas = this.prisma.loja ? await this.prisma.loja.findMany({ where: { ativo: true } }) : []

    if (idLojaAlvo) {
      lojas = lojas.filter((l) => l.id === idLojaAlvo || l.codigo === idLojaAlvo)
    }

    if (!idLojaAlvo && lojas.length === 0) {
      lojas = [
        {
          id: 'loja-inhuma',
          nome: 'Açaí Senses - Inhuma',
          codigo: 'inhuma',
          cnpj: '51572389000180',
          cidade: 'Inhuma',
          uf: 'PI',
          ativo: true,
          erpToken: null,
          idEmpresaErp: 1,
          idOrganizacao: '',
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ]
    }

    const resultado: ResultadoSync = {
      lojasSincronizadas: [],
      lojasIgnoradasSemToken: [],
      totalSucessos: 0,
      totalFalhas: 0,
    }

    for (const loja of lojas) {
      const token =
        loja.erpToken ||
        (loja.id === 'loja-inhuma' || loja.codigo === 'inhuma'
          ? this.config.get<string>('ERP_API_TOKEN')
          : null)

      if (!token) {
        resultado.lojasIgnoradasSemToken.push(loja.nome)
        continue
      }

      this.logger.log(`Sincronizando snapshots para a loja "${loja.nome}" (${loja.id}).`)
      resultado.lojasSincronizadas.push(loja.nome)

      for (const sincronizador of this.sincronizadoresSnapshot.filter(s => !entidades || entidades.includes(s.entidade))) {
        this.verificarTrava()
        const ok = await this.executarComLog(sincronizador.entidade, null, loja.id, () =>
          sincronizador.sincronizar(loja.id, token),
        )
        if (ok) {
          resultado.totalSucessos++
        } else {
          resultado.totalFalhas++
        }
      }
    }

    return resultado
  }

  async status(idLoja?: string, usuario?: import('../common/decorators/current-user.decorator').UsuarioToken): Promise<SyncStatusResponseDto> {
    if (usuario?.perfil === 'FRANQUEADO' && (!usuario.lojas.length || (idLoja && !usuario.lojas.includes(idLoja)))) {
      throw new ForbiddenException('Você não tem permissão para consultar esta unidade.')
    }
    const todasEntidades: EntidadeSync[] = [
      ...this.sincronizadoresJanela.map((s) => s.entidade),
      ...this.sincronizadoresSnapshot.map((s) => s.entidade),
    ]

    const entidades = await Promise.all(
      todasEntidades.map(async (entidade) => {
        const where: any = { entidade }
        if (idLoja) where.idLoja = idLoja
        else if (usuario?.perfil === 'FRANQUEADO') where.idLoja = { in: usuario.lojas }
        const ultimoLog = await this.prisma.syncLog.findFirst({
          where,
          orderBy: { executadoEm: 'desc' },
        })
        return {
          entidade,
          status: ultimoLog?.status ?? ('ERRO' as const),
          executadoEm: ultimoLog?.executadoEm.toISOString() ?? new Date(0).toISOString(),
          dataReferencia: ultimoLog?.dataReferencia ? dateParaDiaIso(ultimoLog.dataReferencia) : null,
          registrosProcessados: ultimoLog?.registrosProcessados ?? 0,
          erro: ultimoLog?.erro ?? (ultimoLog ? null : 'Nunca sincronizado.'),
        }
      }),
    )

    return { entidades }
  }

  async atualizacao(idsLojas: string[], usuario?: import('../common/decorators/current-user.decorator').UsuarioToken) {
    const autorizadas = usuario?.perfil === 'FRANQUEADO' ? usuario.lojas : undefined
    const ids = idsLojas.length ? idsLojas.filter((id) => !autorizadas || autorizadas.includes(id)) : autorizadas
    const lojas = await this.prisma.loja.findMany({
      where: { ativo: true, ...(ids ? { id: { in: ids } } : {}) }, select: { id: true, nome: true },
    })
    const unidades = await Promise.all(lojas.map(async (loja) => {
      const where = { entidade: 'VENDA' as const, idLoja: loja.id, dataReferencia: hojeSaoPaulo() }
      const [ultimo, sucesso] = await Promise.all([
        this.prisma.syncLog.findFirst({ where, orderBy: { executadoEm: 'desc' } }),
        this.prisma.syncLog.findFirst({ where: { ...where, status: 'SUCESSO' }, orderBy: { executadoEm: 'desc' } }),
      ])
      return {
        idLoja: loja.id, nome: loja.nome, status: ultimo?.status ?? 'PENDENTE',
        ultimaTentativa: ultimo?.executadoEm.toISOString() ?? null,
        ultimoSucesso: sucesso?.executadoEm.toISOString() ?? null,
        dataReferencia: dateParaDiaIso(hojeSaoPaulo()),
      }
    }))
    return { intervaloMinutos: 10, unidades }
  }

  private async diasComSucesso(entidade: EntidadeSync, inicio: Date, fim: Date, idLoja?: string): Promise<Set<string>> {
    const where: any = { entidade, status: 'SUCESSO', dataReferencia: { gte: inicio, lte: fim } }
    if (idLoja) where.idLoja = idLoja
    const logs = await this.prisma.syncLog.findMany({
      where,
      select: { dataReferencia: true },
    })
    return new Set(logs.map((l) => dateParaDiaIso(l.dataReferencia!)))
  }

  private async executarComLog(
    entidade: EntidadeSync,
    dataReferencia: Date | null,
    idLoja: string | null,
    tarefa: () => Promise<number>,
  ): Promise<boolean> {
    const contexto = `${entidade}${dataReferencia ? ` (${dateParaDiaIso(dataReferencia)})` : ''}${idLoja ? ` [loja: ${idLoja}]` : ''}`
    this.verificarTrava()
    try {
      const registrosProcessados = await this.comRetentativas(tarefa, contexto)
      await this.prisma.syncLog.create({
        data: { entidade, dataReferencia, idLoja, status: 'SUCESSO', registrosProcessados },
      })
      const entidadeCache = GERACAO_CACHE_POR_ENTIDADE[entidade]
      if (entidadeCache) await this.redis.bumparGeracao(entidadeCache)
      return true
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro)
      this.logger.error(
        `Falha sincronizando ${contexto} após ${TENTATIVAS_POR_TAREFA} tentativa(s): ${mensagem}`,
        erro instanceof Error ? erro.stack : undefined,
      )
      await this.prisma.syncLog.create({
        data: { entidade, dataReferencia, idLoja, status: 'ERRO', registrosProcessados: 0, erro: mensagem },
      })
      return false
    }
  }

  /** Reexecuta `tarefa` até `TENTATIVAS_POR_TAREFA` vezes antes de desistir. `401` (token
   * inválido/expirado) nunca é transitório — não adianta insistir, propaga na primeira falha. */
  private async comRetentativas<T>(tarefa: () => Promise<T>, contexto: string): Promise<T> {
    let ultimoErro: unknown
    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_TAREFA; tentativa++) {
      this.verificarTrava()
      try {
        return await tarefa()
      } catch (erro) {
        ultimoErro = erro
        if (erro instanceof ErpApiError && erro.status === 401) throw erro
        if (tentativa < TENTATIVAS_POR_TAREFA) {
          const mensagem = erro instanceof Error ? erro.message : String(erro)
          this.logger.warn(
            `${contexto}: tentativa ${tentativa}/${TENTATIVAS_POR_TAREFA} falhou (${mensagem}) — tentando de novo em ${BACKOFF_ENTRE_TENTATIVAS_MS}ms.`,
          )
          await new Promise((resolve) => setTimeout(resolve, BACKOFF_ENTRE_TENTATIVAS_MS))
        }
      }
    }
    throw ultimoErro
  }
}
