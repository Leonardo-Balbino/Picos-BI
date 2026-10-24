import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { redigir } from '../utils/redacao-log.util'

/**
 * Trace de requisição/resposta em nível debug — a segunda das duas frentes de
 * redação de log (a primeira é o `HttpExceptionFilter`, no log de erro 5xx).
 * Global (registrado via `APP_INTERCEPTOR` em `app.module.ts`), então nenhum
 * endpoint novo pode esquecer de aplicar isso. Mesmo padrão do
 * Picos-gestao-back — ver MIGRACAO.md deste repositório.
 *
 * Nunca loga headers (Authorization, `x-api-key`, cookies): não tem motivo
 * legítimo pra logar header nenhum aqui, então a exclusão é estrutural (nem
 * entra no payload logado), não uma redação campo a campo.
 */
@Injectable()
export class LogRedactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestTrace')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>()
    const { method, originalUrl } = request
    const body = request.body as unknown

    if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      this.logger.debug(JSON.stringify({ method, route: originalUrl, body: redigir(body) }))
    }

    return next.handle().pipe(
      tap((responseBody: unknown) => {
        if (responseBody !== undefined) {
          this.logger.debug(
            JSON.stringify({ method, route: originalUrl, response: redigir(responseBody) }),
          )
        }
      }),
    )
  }
}
