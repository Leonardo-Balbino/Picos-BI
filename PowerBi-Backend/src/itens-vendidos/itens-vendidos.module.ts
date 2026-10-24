import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { ItensVendidosController } from './itens-vendidos.controller'
import { ItensVendidosService } from './itens-vendidos.service'

@Module({
  imports: [UpstreamModule],
  controllers: [ItensVendidosController],
  providers: [ItensVendidosService],
  exports: [ItensVendidosService],
})
export class ItensVendidosModule {}
