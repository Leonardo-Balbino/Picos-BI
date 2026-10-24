import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import type { Paginado } from '../common/dto/paginated-response.dto'
import { mapProduto, type ProdutoRaw } from './produto.mapper'
import type { ProdutoResponseDto } from './dto/produto-response.dto'
import type { ProdutosQueryDto } from './dto/produtos-query.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class ProdutosService {
  private readonly logger = new Logger(ProdutosService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  /**
   * Catálogo inteiro, sem recorte de data (seção 2.3 do prompt de geração deste backend) —
   * upsert por `codigoMercadoriaVariacao`. Não remove produto que sumiu da resposta do ERP
   * (SKU descontinuado normalmente vira `ativo:'N'`, não desaparece) — se isso se mostrar
   * insuficiente na prática, o próximo passo é marcar como inativo tudo que não veio nesta
   * sincronização, não deletar fisicamente.
   */
  async sincronizarSnapshot(idLoja?: string, token?: string): Promise<number> {
    const secoesMap = new Map<string, string>()
    try {
      const secoes = await this.upstream.getAllPages<{ codigo: string; descricao: string }, any>(
        '/mercadoria-secao/v1',
        { limit: 100 },
        (raw: any) => ({ codigo: String(raw?.codigo ?? ''), descricao: String(raw?.descricao ?? '') }),
        token,
      )
      for (const s of secoes) {
        if (s.codigo && s.descricao) secoesMap.set(s.codigo, s.descricao)
      }
    } catch (e) {
      this.logger.warn(`Não foi possível buscar seções de mercadorias: ${e instanceof Error ? e.message : e}`)
    }

    const itens = await this.upstream.getAllPages<ReturnType<typeof mapProduto>, ProdutoRaw>(
      '/mercadoria/v1',
      { limit: 100 },
      (raw: ProdutoRaw) => mapProduto(raw, secoesMap),
      token,
    )

    await this.prisma.$transaction(
      itens.map((p) => {
        const codigo = codigoDaLoja(p.codigoMercadoriaVariacao, idLoja)
        const dados = { ...p, codigoMercadoriaVariacao: codigo, ...(idLoja ? { idLoja } : {}) }
        return this.prisma.produto.upsert({
          where: { codigoMercadoriaVariacao: codigo },
          create: dados,
          update: dados,
        })
      }),
    )

    this.logger.log(`Produtos: ${itens.length} sincronizado(s)${idLoja ? ` (loja: ${idLoja})` : ''}.`)
    return itens.length
  }

  async listar(query: ProdutosQueryDto, usuario?: UsuarioToken): Promise<Paginado<ProdutoResponseDto>> {
    const where: Prisma.ProdutoWhereInput = query.busca
      ? {
          OR: [
            { descricao: { contains: query.busca, mode: 'insensitive' } },
            { codigoBarras: { contains: query.busca, mode: 'insensitive' } },
          ],
        }
      : {}

    // O catálogo do BI apresenta somente produtos ativos, inclusive no total paginado.
    where.ativo = true

    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (query.idLoja && query.idLoja !== 'todas') {
        if (!usuario.lojas.includes(query.idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar os produtos desta unidade.')
        }
        where.idLoja = query.idLoja
      } else {
        where.idLoja = { in: usuario.lojas }
      }
    } else if (query.idLoja && query.idLoja !== 'todas') {
      where.idLoja = query.idLoja
    }

    const [items, total] = await Promise.all([
      this.prisma.produto.findMany({
        where,
        orderBy: { descricao: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.produto.count({ where }),
    ])

    return {
      items: items.map((p) => ({
        codigoMercadoriaVariacao: p.codigoMercadoriaVariacao,
        descricao: p.descricao,
        codigoBarras: p.codigoBarras,
        referenciaMercadoria: p.referenciaMercadoria,
        embalagem: p.embalagem,
        idMarca: p.idMarca,
        qtdEstoqueMinimo: Number(p.qtdEstoqueMinimo),
        qtdEstoqueMaximo: Number(p.qtdEstoqueMaximo),
        ativo: p.ativo,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
}
