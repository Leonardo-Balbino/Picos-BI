import { ForbiddenException } from '@nestjs/common'
import type { UsuarioToken } from '../decorators/current-user.decorator'

export function escopoLojas(usuario?: UsuarioToken, idsLojas?: string): string[] | undefined {
  const selecionadas = [...new Set((idsLojas ?? '').split(',').map(id => id.trim()).filter(Boolean))]
  if (usuario?.perfil === 'FRANQUEADO') {
    if (!usuario.lojas?.length || selecionadas.some(id => !usuario.lojas.includes(id))) {
      throw new ForbiddenException('Você não tem permissão para consultar estas unidades.')
    }
    return selecionadas.length ? selecionadas : usuario.lojas
  }
  return selecionadas.length ? selecionadas : undefined
}
