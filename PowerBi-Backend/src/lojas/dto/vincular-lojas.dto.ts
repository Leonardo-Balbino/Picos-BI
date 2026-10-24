import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsString } from 'class-validator'

export class VincularLojasDto {
  @ApiProperty({ type: [String], description: 'Lista de IDs das lojas associadas ao usuário franqueado' })
  @IsArray()
  @IsString({ each: true })
  lojaIds!: string[]
}
