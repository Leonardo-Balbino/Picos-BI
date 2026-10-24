import { Type } from 'class-transformer'
import { IsNumber, IsOptional, Min, Max } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { EscopoLojasQueryDto } from '../../common/dto/escopo-lojas-query.dto'
export class EstoqueUrgenciaQueryDto extends EscopoLojasQueryDto {
  @ApiPropertyOptional({ description: 'Limite opcional para esta consulta; não altera o ERP.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000000000)
  limiteAlerta?: number

  @ApiPropertyOptional({ description: 'ID da seção para filtrar dinamicamente' })
  @IsOptional()
  idSecao?: string
}
