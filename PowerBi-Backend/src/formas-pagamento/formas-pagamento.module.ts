import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { FormasPagamentoController } from './formas-pagamento.controller'
import { FormasPagamentoService } from './formas-pagamento.service'

@Module({
  imports: [UpstreamModule],
  controllers: [FormasPagamentoController],
  providers: [FormasPagamentoService],
  exports: [FormasPagamentoService],
})
export class FormasPagamentoModule {}
