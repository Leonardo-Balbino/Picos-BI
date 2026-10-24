import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service'

/** `@Global` — mesmo espírito de `PrismaModule` (seção 3 do documento de padrões): evita
 * reimportar em cada módulo de domínio que precisar cachear uma leitura. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
