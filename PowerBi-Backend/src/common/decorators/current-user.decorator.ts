import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface UsuarioToken {
  sub: string
  email: string
  nome: string
  perfil: 'ADMIN' | 'FRANQUEADO'
  lojas: string[]
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioToken | undefined => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
