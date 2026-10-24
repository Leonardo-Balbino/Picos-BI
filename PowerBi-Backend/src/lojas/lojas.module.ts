import { Module } from '@nestjs/common'
import { LojasService } from './lojas.service'
import { LojasController } from './lojas.controller'

@Module({
  controllers: [LojasController],
  providers: [LojasService],
  exports: [LojasService],
})
export class LojasModule {}
