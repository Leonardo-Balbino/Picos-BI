import { EstoqueAlertasService } from './estoque-alertas.service'
import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { EstoqueController } from './estoque.controller'
import { EstoqueService } from './estoque.service'

@Module({
  imports: [UpstreamModule],
  controllers: [EstoqueController],
  providers: [EstoqueService, EstoqueAlertasService],
  exports: [EstoqueService],
})
export class EstoqueModule {}
