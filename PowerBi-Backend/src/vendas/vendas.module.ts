import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { VendasController } from './vendas.controller'
import { VendasService } from './vendas.service'
import { DreService } from './dre.service'

@Module({
  imports: [UpstreamModule],
  controllers: [VendasController],
  providers: [VendasService, DreService],
  exports: [VendasService, DreService],
})
export class VendasModule {}
