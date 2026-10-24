import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { UsuarioToken } from '../common/decorators/current-user.decorator'
import type { CriarLojaDto } from './dto/criar-loja.dto'
import type { AtualizarLojaDto } from './dto/atualizar-loja.dto'
import type { LojaResponseDto } from './dto/loja-response.dto'
import type { FranqueadoResponseDto } from './dto/franqueado-response.dto'
import type { VincularLojasDto } from './dto/vincular-lojas.dto'
import type { CriarFranqueadoDto } from './dto/criar-franqueado.dto'

@Injectable()
export class LojasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuario?: UsuarioToken): Promise<LojaResponseDto[]> {
    const where: any = { ativo: true }

    if (usuario && usuario.perfil === 'FRANQUEADO') {
      where.id = { in: usuario.lojas }
    }

    const lojas = await this.prisma.loja.findMany({
      where,
      orderBy: { nome: 'asc' },
    })

    return lojas.map((l) => ({
      id: l.id,
      idOrganizacao: l.idOrganizacao,
      nome: l.nome,
      codigo: l.codigo,
      cnpj: l.cnpj,
      cidade: l.cidade,
      uf: l.uf,
      ativo: l.ativo,
      idEmpresaErp: l.idEmpresaErp,
    }))
  }

  async criar(dto: CriarLojaDto): Promise<LojaResponseDto> {
    const codigoLimpo = dto.codigo.trim().toLowerCase()

    const existente = await this.prisma.loja.findUnique({
      where: { codigo: codigoLimpo },
    })
    if (existente) {
      throw new ConflictException(`Já existe uma loja cadastrada com o código ${codigoLimpo}.`)
    }

    let idOrganizacao = dto.idOrganizacao
    if (!idOrganizacao) {
      const org = await this.prisma.organizacao.findFirst()
      if (!org) {
        const novaOrg = await this.prisma.organizacao.create({
          data: {
            nome: 'Rede Açaí Senses',
            codigo: 'acai-senses',
          },
        })
        idOrganizacao = novaOrg.id
      } else {
        idOrganizacao = org.id
      }
    }

    const loja = await this.prisma.loja.create({
      data: {
        idOrganizacao,
        nome: dto.nome.trim(),
        codigo: codigoLimpo,
        cnpj: dto.cnpj?.trim(),
        cidade: dto.cidade?.trim(),
        uf: dto.uf?.trim().toUpperCase(),
        erpToken: dto.erpToken?.trim(),
        idEmpresaErp: dto.idEmpresaErp,
        ativo: true,
      },
    })

    return {
      id: loja.id,
      idOrganizacao: loja.idOrganizacao,
      nome: loja.nome,
      codigo: loja.codigo,
      cnpj: loja.cnpj,
      cidade: loja.cidade,
      uf: loja.uf,
      ativo: loja.ativo,
      idEmpresaErp: loja.idEmpresaErp,
    }
  }

  async atualizar(id: string, dto: AtualizarLojaDto): Promise<LojaResponseDto> {
    const lojaExistente = await this.prisma.loja.findUnique({
      where: { id },
    })
    if (!lojaExistente) {
      throw new NotFoundException(`Loja não encontrada.`)
    }

    const data: any = {}
    if (dto.nome !== undefined) data.nome = dto.nome.trim()
    if (dto.cnpj !== undefined) data.cnpj = dto.cnpj.trim()
    if (dto.cidade !== undefined) data.cidade = dto.cidade.trim()
    if (dto.uf !== undefined) data.uf = dto.uf.trim().toUpperCase()
    if (dto.erpToken !== undefined) data.erpToken = dto.erpToken.trim()
    if (dto.idEmpresaErp !== undefined) data.idEmpresaErp = dto.idEmpresaErp
    if (dto.ativo !== undefined) data.ativo = dto.ativo

    const loja = await this.prisma.loja.update({
      where: { id },
      data,
    })

    return {
      id: loja.id,
      idOrganizacao: loja.idOrganizacao,
      nome: loja.nome,
      codigo: loja.codigo,
      cnpj: loja.cnpj,
      cidade: loja.cidade,
      uf: loja.uf,
      ativo: loja.ativo,
      idEmpresaErp: loja.idEmpresaErp,
    }
  }

  async listarFranqueados(): Promise<FranqueadoResponseDto[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { perfil: 'FRANQUEADO' },
      include: {
        lojas: {
          include: {
            loja: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return usuarios.map((u) => ({
      id: u.id,
      email: u.email,
      nome: u.nome,
      perfil: u.perfil,
      ativo: u.ativo,
      lojas: u.lojas.map((ul) => ({
        id: ul.loja.id,
        idOrganizacao: ul.loja.idOrganizacao,
        nome: ul.loja.nome,
        codigo: ul.loja.codigo,
        cnpj: ul.loja.cnpj,
        cidade: ul.loja.cidade,
        uf: ul.loja.uf,
        ativo: ul.loja.ativo,
        idEmpresaErp: ul.loja.idEmpresaErp,
      })),
    }))
  }

  async criarFranqueado(dto: CriarFranqueadoDto): Promise<FranqueadoResponseDto> {
    const emailLimpo = dto.email.trim().toLowerCase()

    const existente = await this.prisma.usuario.findUnique({
      where: { email: emailLimpo },
    })
    if (existente) {
      throw new ConflictException(`Já existe um usuário com o e-mail ${emailLimpo}.`)
    }

    const salt = await bcrypt.genSalt(10)
    const senhaHash = await bcrypt.hash(dto.senha, salt)

    const usuario = await this.prisma.usuario.create({
      data: {
        email: emailLimpo,
        senha: senhaHash,
        nome: dto.nome.trim(),
        perfil: 'FRANQUEADO',
        ativo: true,
      },
    })

    if (dto.lojaIds && dto.lojaIds.length > 0) {
      await this.prisma.usuarioLoja.createMany({
        data: dto.lojaIds.map((idLoja) => ({
          idUsuario: usuario.id,
          idLoja,
        })),
        skipDuplicates: true,
      })
    }

    const atualizado = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuario.id },
      include: { lojas: { include: { loja: true } } },
    })

    return {
      id: atualizado.id,
      email: atualizado.email,
      nome: atualizado.nome,
      perfil: atualizado.perfil,
      ativo: atualizado.ativo,
      lojas: atualizado.lojas.map((ul) => ({
        id: ul.loja.id,
        idOrganizacao: ul.loja.idOrganizacao,
        nome: ul.loja.nome,
        codigo: ul.loja.codigo,
        cnpj: ul.loja.cnpj,
        cidade: ul.loja.cidade,
        uf: ul.loja.uf,
        ativo: ul.loja.ativo,
        idEmpresaErp: ul.loja.idEmpresaErp,
      })),
    }
  }

  async vincularLojas(idUsuario: string, dto: VincularLojasDto): Promise<FranqueadoResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
    })
    if (!usuario) {
      throw new NotFoundException(`Usuário não encontrado.`)
    }

    await this.prisma.$transaction([
      this.prisma.usuarioLoja.deleteMany({
        where: { idUsuario },
      }),
      this.prisma.usuarioLoja.createMany({
        data: dto.lojaIds.map((idLoja) => ({
          idUsuario,
          idLoja,
        })),
        skipDuplicates: true,
      }),
    ])

    const atualizado = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: idUsuario },
      include: { lojas: { include: { loja: true } } },
    })

    return {
      id: atualizado.id,
      email: atualizado.email,
      nome: atualizado.nome,
      perfil: atualizado.perfil,
      ativo: atualizado.ativo,
      lojas: atualizado.lojas.map((ul) => ({
        id: ul.loja.id,
        idOrganizacao: ul.loja.idOrganizacao,
        nome: ul.loja.nome,
        codigo: ul.loja.codigo,
        cnpj: ul.loja.cnpj,
        cidade: ul.loja.cidade,
        uf: ul.loja.uf,
        ativo: ul.loja.ativo,
        idEmpresaErp: ul.loja.idEmpresaErp,
      })),
    }
  }
}
