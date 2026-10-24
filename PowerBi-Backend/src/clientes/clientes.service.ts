import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import type { Paginado } from '../common/dto/paginated-response.dto'
import { mapPessoa, type PessoaRaw } from './pessoa.mapper'
import type { PessoaResponseDto } from './dto/pessoa-response.dto'
import type { ClientesQueryDto } from './dto/clientes-query.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  async sincronizarSnapshot(idLoja?: string, token?: string): Promise<number> {
    const itens = await this.upstream.getAllPages<ReturnType<typeof mapPessoa>, PessoaRaw>(
      '/pessoa/v1',
      { limit: 100 },
      mapPessoa,
      token,
    )

    await this.prisma.$transaction(
      itens.map((p) => {
        const codigo = codigoDaLoja(p.codigo, idLoja)
        const dados = { ...p, codigo, ...(idLoja ? { idLoja } : {}) }
        return this.prisma.pessoa.upsert({ where: { codigo }, create: dados, update: dados })
      }),
    )

    this.logger.log(`Clientes/fornecedores: ${itens.length} sincronizado(s)${idLoja ? ` (loja: ${idLoja})` : ''}.`)
    return itens.length
  }

  async listar(query: ClientesQueryDto, usuario?: UsuarioToken): Promise<Paginado<PessoaResponseDto>> {
    const where: Prisma.PessoaWhereInput = query.busca
      ? {
          OR: [
            { razaoSocial: { contains: query.busca, mode: 'insensitive' } },
            { fantasia: { contains: query.busca, mode: 'insensitive' } },
            { cnpjCpf: { contains: query.busca } },
          ],
        }
      : {}

    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (query.idLoja && query.idLoja !== 'todas') {
        if (!usuario.lojas.includes(query.idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar os clientes desta unidade.')
        }
        where.idLoja = query.idLoja
      } else {
        where.idLoja = { in: usuario.lojas }
      }
    } else if (query.idLoja && query.idLoja !== 'todas') {
      where.idLoja = query.idLoja
    }

    const [items, total] = await Promise.all([
      this.prisma.pessoa.findMany({
        where,
        orderBy: { fantasia: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.pessoa.count({ where }),
    ])

    return {
      items: items.map((p) => ({
        codigo: p.codigo,
        razaoSocial: p.razaoSocial,
        fantasia: p.fantasia,
        tipo: p.tipo,
        cnpjCpf: p.cnpjCpf,
        dataCadastro: p.dataCadastro,
        ativo: p.ativo,
        contato: { fone: p.contatoFone, celular: p.contatoCelular, email: p.contatoEmail },
        uf: p.uf,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    }
  }
}
