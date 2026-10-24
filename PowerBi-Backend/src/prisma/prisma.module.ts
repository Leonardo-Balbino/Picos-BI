import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/** `@Global` — evita reimportar em cada módulo de domínio (seção 3 do documento de padrões). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
