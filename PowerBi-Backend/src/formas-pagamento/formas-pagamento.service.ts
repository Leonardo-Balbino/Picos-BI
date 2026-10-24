import { codigoDaLoja } from '../common/utils/codigo-loja.util'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { mapFormaPagamento, type FormaPagamentoRaw } from './forma-pagamento.mapper'
import type { FormaPagamentoResponseDto } from './dto/forma-pagamento-response.dto'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'

@Injectable()
export class FormasPagamentoService {
  private readonly logger = new Logger(FormasPagamentoService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  async sincronizarSnapshot(idLoja?: string, token?: string): Promise<number> {
    const itens = await this.upstream.getAllPages<ReturnType<typeof mapFormaPagamento>, FormaPagamentoRaw>(
      '/pagamento/v1',
      { limit: 100 },
      mapFormaPagamento,
      token,
    )

    await this.prisma.$transaction(
      itens.map((f) => {
        const codigo = codigoDaLoja(f.codigo, idLoja)
        const dados = { ...f, codigo, ...(idLoja ? { idLoja } : {}) }
        return this.prisma.formaPagamentoDim.upsert({ where: { codigo }, create: dados, update: dados })
      }),
    )

    this.logger.log(`Formas de pagamento: ${itens.length} sincronizada(s)${idLoja ? ` (loja: ${idLoja})` : ''}.`)
    return itens.length
  }

  async listar(usuario?: UsuarioToken, idLoja?: string): Promise<FormaPagamentoResponseDto[]> {
    const where: any = {}

    if (usuario && usuario.perfil === 'FRANQUEADO') {
      if (!usuario.lojas || usuario.lojas.length === 0) {
        throw new ForbiddenException('Usuário franqueado não possui lojas autorizadas vinculadas.')
      }
      if (idLoja && idLoja !== 'todas') {
        if (!usuario.lojas.includes(idLoja)) {
          throw new ForbiddenException('Você não tem permissão para acessar as formas de pagamento desta unidade.')
        }
        where.idLoja = idLoja
      } else {
        where.OR = [{ idLoja: { in: usuario.lojas } }, { idLoja: null }]
      }
    } else if (idLoja && idLoja !== 'todas') {
      where.idLoja = idLoja
    }

    const linhas = await this.prisma.formaPagamentoDim.findMany({
      where,
      orderBy: { descricao: 'asc' },
    })

    return linhas.map((f) => ({
      codigo: f.codigo,
      descricao: f.descricao,
      idTipo: f.idTipo,
      tipoDescricao: f.tipoDescricao,
      aVista: f.aVista,
      ativo: f.ativo,
    }))
  }
}

