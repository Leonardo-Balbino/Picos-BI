import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { ClientesController } from './clientes.controller'
import { ClientesService } from './clientes.service'

@Module({
  imports: [UpstreamModule],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
