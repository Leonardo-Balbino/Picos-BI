import { Module } from '@nestjs/common'
import { UpstreamModule } from '../upstream/upstream.module'
import { EmpresaController } from './empresa.controller'
import { EmpresaService } from './empresa.service'

@Module({
  imports: [UpstreamModule],
  controllers: [EmpresaController],
  providers: [EmpresaService],
  exports: [EmpresaService],
})
export class EmpresaModule {}
