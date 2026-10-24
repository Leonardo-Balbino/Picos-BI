import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { ComissoesController } from './comissoes.controller'
import { ComissoesService } from './comissoes.service'

@Module({
  imports: [UpstreamModule],
  controllers: [ComissoesController],
  providers: [ComissoesService],
  exports: [ComissoesService],
})
export class ComissoesModule {}
