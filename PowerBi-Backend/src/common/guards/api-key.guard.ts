import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { Request } from 'express'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { PrismaService } from '../../prisma/prisma.service'

const NOME_HEADER_API_KEY = 'x-api-key'

/**
 * Guard global: protege todas as rotas não marcadas com `@Public()`.
 * Aceita autenticação segura via JWT Bearer token ou chave de API (X-API-Key).
 * Invalidação em tempo real: verifica no banco o vínculo ativo das lojas do usuário,
 * garantindo que remoções de vínculo pela Matriz tenham efeito imediato sem esperar o token de 7 dias expirar.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()

    // 1. Tenta autenticação por Bearer JWT
    const authHeader = request.header('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      try {
        const payload = await this.jwtService.verifyAsync(token)

        // Consulta permissões e status vigentes no banco de dados
        if (this.prisma?.usuario?.findUnique) {
          const usuarioDb = await this.prisma.usuario.findUnique({
            where: { id: payload.sub },
            include: { lojas: true },
          })

          if (!usuarioDb || !usuarioDb.ativo) {
            throw new UnauthorizedException({
              code: 'UNAUTHORIZED',
              message: 'Usuário desativado ou inexistente.',
            })
          }

          const lojasVigentes = usuarioDb.lojas.map((ul) => ul.idLoja)
          ;(request as any).user = {
            sub: usuarioDb.id,
            email: usuarioDb.email,
            nome: usuarioDb.nome,
            perfil: usuarioDb.perfil as 'ADMIN' | 'FRANQUEADO',
            lojas: lojasVigentes,
          }
        } else {
          ;(request as any).user = payload
        }

        return true
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          throw err
        }
        // Se o token fornecido for inválido/expirado, prossegue para checagem de API Key ou lança erro
      }
    }

    // 2. Tenta autenticação por X-API-Key
    const recebida = request.header(NOME_HEADER_API_KEY)
    if (recebida && this.chaveValida(recebida)) {
      return true
    }

    throw new UnauthorizedException({
      code: 'UNAUTHORIZED',
      message: 'Credenciais de acesso ausentes ou inválidas (JWT Bearer ou X-API-Key).',
    })
  }

  /**
   * Comparação em tempo constante contra timing attacks.
   */
  private chaveValida(recebida: string): boolean {
    const esperada = this.config.get<string>('BACKEND_API_KEY')
    if (!esperada) return false
    const hashRecebida = createHash('sha256').update(recebida).digest()
    const hashEsperada = createHash('sha256').update(esperada).digest()
    return timingSafeEqual(hashRecebida, hashEsperada)
  }
}
