import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'

export interface UsuarioAutenticado {
  id: string
  email: string
  nome: string
  perfil: string
  lojasAutorizadas: string[]
}

export interface RespostaLogin {
  accessToken: string
  usuario: UsuarioAutenticado
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.inicializarContaPadrao()
  }

  /**
   * Garante a criação da conta solicitada caso não exista ou sincroniza a senha.
   */
  async inicializarContaPadrao(): Promise<void> {
    const contasIniciais = [
      {
        email: 'picossistemas.adm@gmail.com',
        senhaPlana: 'Picos@admin2026',
        nome: 'Picos Sistemas Admin',
        perfil: 'ADMIN' as const,
      },
      {
        email: 'leovinicius569@gmail.com',
        senhaPlana: 'Lun@#2027',
        nome: 'Léo Vinicius',
        perfil: 'ADMIN' as const,
      },
    ]

    const lojaPadrao = this.prisma.loja
      ? await this.prisma.loja.findFirst({ where: { codigo: 'inhuma' } })
      : null

    for (const c of contasIniciais) {
      const salt = await bcrypt.genSalt(10)
      const senhaHash = await bcrypt.hash(c.senhaPlana, salt)

      const usuario = await this.prisma.usuario.upsert({
        where: { email: c.email },
        create: {
          email: c.email,
          senha: senhaHash,
          nome: c.nome,
          perfil: c.perfil,
          ativo: true,
        },
        update: {
          senha: senhaHash,
          perfil: c.perfil,
          ativo: true,
        },
      })
      this.logger.log(`Conta de administrador verificada/atualizada: ${c.email}`)

      if (lojaPadrao) {
        await this.prisma.usuarioLoja.upsert({
          where: {
            idUsuario_idLoja: {
              idUsuario: usuario.id,
              idLoja: lojaPadrao.id,
            },
          },
          create: {
            idUsuario: usuario.id,
            idLoja: lojaPadrao.id,
          },
          update: {},
        })
      }
    }
  }

  async login(dto: LoginDto): Promise<RespostaLogin> {
    const emailLimpo = dto.email.trim().toLowerCase()

    const usuario = await this.prisma.usuario.findUnique({
      where: { email: emailLimpo },
      include: {
        lojas: {
          include: {
            loja: true,
          },
        },
      },
    })

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'E-mail ou senha inválidos.',
      })
    }

    const senhaCorreta = await bcrypt.compare(dto.senha, usuario.senha)
    if (!senhaCorreta) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'E-mail ou senha inválidos.',
      })
    }

    const lojasAutorizadas = usuario.lojas.map((ul) => ul.idLoja)

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      lojas: lojasAutorizadas,
    }

    const accessToken = await this.jwtService.signAsync(payload)

    return {
      accessToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        lojasAutorizadas,
      },
    }
  }

  async verificarToken(token: string): Promise<UsuarioAutenticado> {
    try {
      const payload = await this.jwtService.verifyAsync(token)
      return {
        id: payload.sub,
        email: payload.email,
        nome: payload.nome,
        perfil: payload.perfil,
        lojasAutorizadas: payload.lojas ?? [],
      }
    } catch {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token de autenticação inválido ou expirado.',
      })
    }
  }
}
