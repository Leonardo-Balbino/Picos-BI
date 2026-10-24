import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import type { Application } from 'express'
import { AppModule } from './app.module'
import { configurarApp, PREFIXO_GLOBAL } from './bootstrap.config'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  // Prefixo, pipes, filters e Swagger — compartilhado com `test/app.e2e-spec.ts` (ver
  // `bootstrap.config.ts`), pra não arriscar o teste e2e divergir do bootstrap real.
  configurarApp(app)

  app.use(helmet())

  // Atrás de um reverse proxy (Nginx, load balancer) em staging/prod — sem isso, o IP de
  // origem observado pela aplicação é sempre o do proxy, não o do client real (seção 12 do
  // documento de padrões). Inofensivo em dev local, sem proxy na frente.
  const expressApp = app.getHttpAdapter().getInstance() as Application
  expressApp.set('trust proxy', 1)

  const origensPermitidas = config
    .get<string>('CORS_ORIGIN')!
    .split(',')
    .map((o) => o.trim())
  app.enableCors({
    origin: origensPermitidas,
    // Sem credentials: a auth é uma chave de API em header custom, não cookie de sessão — CORS
    // credenciado seria superfície de ataque desnecessária (seção 12 do documento de padrões).
    credentials: false,
  })

  const port = config.get<number>('PORT')!
  await app.listen(port)
  Logger.log(
    `Aplicação no ar em http://localhost:${port}/${PREFIXO_GLOBAL} (docs em /${PREFIXO_GLOBAL}/docs)`,
    'Bootstrap',
  )
}

void bootstrap()
