import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Marca uma rota como isenta do `ApiKeyGuard` global. O guard é fechado por padrão (seção 5 do
 * documento de padrões) — uma rota nova nasce protegida a menos que explicitamente marcada
 * pública, nunca o inverso. Uso hoje: healthcheck e a própria documentação Swagger.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
