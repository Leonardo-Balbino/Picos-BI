import { ContasReceberClientesService } from './contas-receber-clientes.service'
import { ContasReceberPainelService } from './contas-receber-painel.service'
import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { ContasAPagarController } from './contas-a-pagar.controller'
import { ContasAReceberController } from './contas-a-receber.controller'
import { ContasPendentesService } from './contas-pendentes.service'

@Module({
  imports: [UpstreamModule],
  controllers: [ContasAReceberController, ContasAPagarController],
  providers: [ContasPendentesService, ContasReceberPainelService, ContasReceberClientesService],
  exports: [ContasPendentesService],
})
export class ContasPendentesModule {}
