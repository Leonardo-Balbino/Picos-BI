import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { retryComBackoff } from '../common/utils/retry-com-backoff.util'

/** Client Prisma injetável — único ponto de conexão com o Postgres da aplicação inteira. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  async onModuleInit(): Promise<void> {
    // Retry com backoff (ver retry-com-backoff.util.ts): na infra consolidada o
    // Postgres central vive numa stack Compose separada desta app — sem
    // `depends_on: condition: service_healthy` garantindo que já esteja no ar
    // quando este container sobe.
    await retryComBackoff(() => this.$connect(), {
      descricao: 'Conexão inicial ao Postgres',
      logger: this.logger,
    })
    this.logger.log('Conectado ao Postgres.')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
