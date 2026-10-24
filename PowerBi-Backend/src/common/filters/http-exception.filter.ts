import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Request, Response } from 'express'
import { redigir } from '../utils/redacao-log.util'

/** Formato único de erro do projeto — nenhum controller/service formata resposta de erro na mão. */
export interface ErroPayload {
  code: string
  message: string
  fields?: Record<string, string>
}

/** Quando um service lança `new UnprocessableEntityException({ code, message, fields? })`, este
 * filtro reconhece o formato e repassa como está, em vez de reformatar (ver seção 4 do
 * documento de padrões). */
function ehErroPayload(valor: unknown): valor is ErroPayload {
  return typeof valor === 'object' && valor !== null && 'code' in valor && 'message' in valor
}

/** `code` default por status HTTP, usado quando a exceção não trouxe um `code` custom (ex.:
 * uma `NotFoundException('...')` nativa do Nest, sem payload estruturado). */
const CODE_PADRAO_POR_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'BUSINESS_RULE_VIOLATION',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
}

const MENSAGEM_ERRO_INTERNO = 'Ocorreu um erro interno. Tente novamente em instantes.'

/**
 * Único `ExceptionFilter` global da aplicação (seção 7 do documento de padrões). Responsável
 * por normalizar QUALQUER erro — validação, negócio, auth, 404, ou uma exceção genuína não
 * tratada — no mesmo formato `{ error: { code, message, fields? } }`, e por nunca deixar
 * stack trace ou detalhe interno vazar no corpo da resposta.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const { status, payload } = this.normalizar(exception)

    if (status >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception)
      // Corpo sempre redigido (ver redacao-log.util.ts, lista de permissão) — um 500
      // pode vir de qualquer endpoint, inclusive os que espelham dado de venda/cliente
      // vindo do ERP; dado comercial não pode aparecer aqui nem em caminho de erro.
      const corpoRedigido =
        request.body && Object.keys(request.body as object).length > 0
          ? JSON.stringify(redigir(request.body))
          : '{}'
      this.logger.error(`${request.method} ${request.url} -> ${status} body=${corpoRedigido}`, stack)
    }
    // Erros 4xx são uso normal da API (validação, regra de negócio) — não logados como erro
    // pra não poluir o log de produção; ficam só na resposta HTTP pro client tratar.

    response.status(status).json({ error: payload })
  }

  private normalizar(exception: unknown): { status: number; payload: ErroPayload } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      if (ehErroPayload(body)) {
        return { status, payload: body }
      }

      // Exceção nativa do Nest (ex.: `new NotFoundException('Venda não encontrada')`) — body
      // pode ser string ou `{ message, statusCode, error }` (formato default do Nest).
      const mensagem =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? String(body.message)
            : exception.message

      return {
        status,
        payload: { code: CODE_PADRAO_POR_STATUS[status] ?? `HTTP_${status}`, message: mensagem },
      }
    }

    // Exceção genuína não tratada — nunca expor o erro real no corpo, só no log (acima).
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: { code: 'INTERNAL_ERROR', message: MENSAGEM_ERRO_INTERNO },
    }
  }
}
