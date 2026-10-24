import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
export class EscopoLojasQueryDto {
  @ApiPropertyOptional({ description: 'IDs das unidades separados por vírgula. Ausente: todas as autorizadas.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  idsLojas?: string
}
