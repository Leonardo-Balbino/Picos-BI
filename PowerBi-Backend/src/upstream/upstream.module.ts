import { Module } from '@nestjs/common'
import { MeuErpOnlineClient } from './meu-erp-online.client'

@Module({
  providers: [MeuErpOnlineClient],
  exports: [MeuErpOnlineClient],
})
export class UpstreamModule {}
