import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import { CACHE_ENTIDADES } from '../redis/cache-entidades'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import {
  mapLocalEstoque,
  mapSaldoEstoque,
  type LocalEstoqueRaw,
  type SaldoEstoqueRaw,
} from './estoque.mapper'
import type { EstoqueResumoResponseDto } from './dto/estoque-resumo-response.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class EstoqueService {
  private readonly logger = new Logger(EstoqueService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  /**
   * Sincroniza locais de estoque e, pra cada local ativo, o saldo por produto. Um local com
   * schema de saldo inesperado (ver nota em `estoque.mapper.ts`) não aborta os outros — o erro
   * é coletado e relançado só no final, depois de já ter persistido o que deu certo. Isso é o
   * que faz `disponivel` (em `resumo()`) refletir corretamente "a última sincronização teve
   * problema", sem jogar fora dado bom de locais que funcionaram.
   */
  async sincronizarSnapshot(idLoja?: string, token?: string): Promise<number> {
    const locais = await this.upstream.getAllPages<ReturnType<typeof mapLocalEstoque>, LocalEstoqueRaw>(
      '/local-estoque/v1',
      { limit: 100 },
      mapLocalEstoque,
      token,
    )

    await this.prisma.$transaction(
      locais.map((l) => {
        const codigo = codigoDaLoja(l.codigo, idLoja)
        const dados = { ...l, codigo, ...(idLoja ? { idLoja } : {}) }
        return this.prisma.localEstoque.upsert({ where: { codigo }, create: dados, update: dados })
      }),
    )

    const locaisAtivos = locais.filter((l) => l.ativo)
    let totalSaldos = 0
    const erros: string[] = []

    for (const local of locaisAtivos) {
      try {
        const saldos = await this.upstream.getAllPages<ReturnType<typeof mapSaldoEstoque>, SaldoEstoqueRaw>(
          `/local-estoque/${local.codigo}/estoques/v1`,
          { limit: 100 },
          mapSaldoEstoque,
          token,
        )

        await this.prisma.$transaction(
          saldos.map((s) =>
            this.prisma.saldoEstoque.upsert({
              where: {
                idLocal_idMercadoriaVariacao: {
                  idLocal: codigoDaLoja(local.codigo, idLoja),
                  idMercadoriaVariacao: codigoDaLoja(s.idMercadoriaVariacao, idLoja),
                },
              },
              create: { ...s, idLocal: codigoDaLoja(local.codigo, idLoja), idMercadoriaVariacao: codigoDaLoja(s.idMercadoriaVariacao, idLoja) },
              update: { qtdSaldo: s.qtdSaldo, qtdSaldoReserva: s.qtdSaldoReserva, dataHora: s.dataHora },
            }),
          ),
        )
        totalSaldos += saldos.length
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro)
        this.logger.warn(`Estoque: falha sincronizando local ${local.codigo} — ${mensagem}`)
        erros.push(`${local.codigo}: ${mensagem}`)
      }
    }

    this.logger.log(`Estoque: ${locais.length} local(is), ${totalSaldos} saldo(s) sincronizado(s).`)

    if (erros.length > 0) {
      throw new Error(
        `Sincronização de estoque teve ${erros.length} local(is) com falha: ${erros.join('; ')}`,
      )
    }

    return totalSaldos
  }

  async resumo(usuario?: UsuarioToken, idLoja?: string): Promise<EstoqueResumoResponseDto> {
    let lojasFiltro: string[] | undefined
    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (idLoja && idLoja !== 'todas') {
        if (!usuario.lojas.includes(idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar o estoque desta unidade.')
        }
        lojasFiltro = [idLoja]
      } else {
        lojasFiltro = usuario.lojas
      }
    } else if (idLoja && idLoja !== 'todas') {
      lojasFiltro = [idLoja]
    }

    const escopoLoja = lojasFiltro ? lojasFiltro.slice().sort().join('_') : 'todas'
    const chave = await this.redis.chaveComGeracao(CACHE_ENTIDADES.ESTOQUE, `total-itens:${escopoLoja}`)

    const whereLocais: any = {}
    if (lojasFiltro && lojasFiltro.length > 0) {
      whereLocais.idLoja = { in: lojasFiltro }
    }

    const [totalItens, locais, ultimoLog] = await Promise.all([
      this.redis.getOrSet(chave, () => this.somarSaldosDoPostgres(lojasFiltro)),
      this.prisma.localEstoque.findMany({ where: whereLocais, orderBy: { descricao: 'asc' } }),
      this.prisma.syncLog.findFirst({ where: { entidade: 'ESTOQUE', ...(lojasFiltro ? { idLoja: { in: lojasFiltro } } : {}) }, orderBy: { executadoEm: 'desc' } }),
    ])

    return {
      totalItens,
      disponivel: !ultimoLog || ultimoLog.status === 'SUCESSO',
      locais: locais.map((l) => ({ codigo: l.codigo, descricao: l.descricao, ativo: l.ativo })),
    }
  }

  private async somarSaldosDoPostgres(lojasFiltro?: string[]): Promise<number> {
    const whereSaldos: any = {}
    if (lojasFiltro && lojasFiltro.length > 0) {
      whereSaldos.local = { idLoja: { in: lojasFiltro } }
    }

    const saldos = await this.prisma.saldoEstoque.findMany({
      where: whereSaldos,
      select: { qtdSaldo: true },
    })
    return saldos.reduce((acc, s) => acc + Math.max(0, Number(s.qtdSaldo)), 0)
  }
}

