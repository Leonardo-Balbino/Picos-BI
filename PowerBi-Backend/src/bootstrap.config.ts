import type { INestApplication } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { validationExceptionFactory } from './common/validation/validation-exception-factory'

export const PREFIXO_GLOBAL = 'api/v1'

/**
 * Wiring de prefixo/pipes/filters/Swagger extraído de `main.ts` pra ser reaproveitado também
 * pelo `test/app.e2e-spec.ts` — sem isso, o teste e2e monta sua própria cópia dessas opções e
 * arrisca divergir silenciosamente do que a aplicação real usa (seção 14 do documento de
 * padrões: nunca duplicar o que pode ser reaproveitado). Deliberadamente NÃO inclui
 * `helmet()`/CORS/`trust proxy`/`.listen()` — são preocupações de servidor HTTP real, sem
 * sentido pra uma aplicação de teste rodando in-memory via `supertest`.
 */
export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix(PREFIXO_GLOBAL)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  )

  app.useGlobalFilters(new HttpExceptionFilter())

  const documentoSwagger = new DocumentBuilder()
    .setTitle('PICOS Analytics — Backend de Sincronização')
    .setDescription(
      'Sincroniza uma janela rolante de 365 dias da API Meu ERP Online em Postgres e serve isso ' +
        'de volta ao front do PICOS Analytics via REST rápido.',
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build()
  const documento = SwaggerModule.createDocument(app, documentoSwagger)
  SwaggerModule.setup(`${PREFIXO_GLOBAL}/docs`, app, documento)
}
