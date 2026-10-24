import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { ProdutosController } from './produtos.controller'
import { ProdutosService } from './produtos.service'

@Module({
  imports: [UpstreamModule],
  controllers: [ProdutosController],
  providers: [ProdutosService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
