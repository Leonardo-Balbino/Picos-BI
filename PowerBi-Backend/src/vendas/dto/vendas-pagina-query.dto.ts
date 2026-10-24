import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { VendasResumoQueryDto } from './vendas-resumo-query.dto'

export class VendasPaginaQueryDto extends VendasResumoQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @ApiPropertyOptional({ default: 8, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 8

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  busca?: string

  @ApiPropertyOptional({ enum: ['dataHora', 'valTotal'] })
  @IsOptional()
  @IsIn(['dataHora', 'valTotal'])
  sort?: string

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  direcao?: string
}
