import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import { PrismaService } from '../prisma/prisma.service'
import { MeuErpOnlineClient } from '../upstream/meu-erp-online.client'
import { mapEmpresa, type EmpresaRaw } from './empresa.mapper'
import type { EmpresaResponseDto } from './dto/empresa-response.dto'

/** Sempre upsert com `id: "default"` — não existe endpoint pra mais de uma empresa nesta fase
 * single-org do produto (ver nota equivalente em `prisma/schema.prisma`). */
const ID_SINGLETON = 'default'

@Injectable()
export class EmpresaService {
  private readonly logger = new Logger(EmpresaService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly upstream: MeuErpOnlineClient,
  ) {}

  async sincronizarSnapshot(idLoja?: string, token?: string): Promise<number> {
    const raw = await this.upstream.get<EmpresaRaw>('/empresa/v1', undefined, token)
    const empresa = mapEmpresa(raw)
    const id = !idLoja || idLoja === 'loja-inhuma' ? ID_SINGLETON : 'empresa_' + idLoja

    await this.prisma.empresa.upsert({
      where: { id },
      create: { id, ...empresa },
      update: empresa,
    })

    this.logger.log('Empresa: sincronizada.')
    return 1
  }

  async obter(usuario?: UsuarioToken, idLoja?: string): Promise<EmpresaResponseDto> {
    let alvo = idLoja && idLoja !== 'todas' ? idLoja : undefined
    if (usuario?.perfil === 'FRANQUEADO') {
      if (!usuario.lojas.length || (alvo && !usuario.lojas.includes(alvo))) {
        throw new ForbiddenException('Você não tem permissão para acessar esta empresa.')
      }
      alvo ??= usuario.lojas.slice().sort()[0]
    }
    const id = !alvo || alvo === 'loja-inhuma' ? ID_SINGLETON : 'empresa_' + alvo
    const empresa = await this.prisma.empresa.findUnique({ where: { id } })
    if (!empresa) {
      throw new NotFoundException({
        code: 'EMPRESA_NAO_SINCRONIZADA',
        message: 'Dados da empresa ainda não foram sincronizados.',
      })
    }
    return {
      fantasia: empresa.fantasia,
      razaoSocial: empresa.razaoSocial,
      cnpjCpf: empresa.cnpjCpf,
      municipio: empresa.municipio,
      uf: empresa.uf,
      logo: empresa.logo,
    }
  }
}
