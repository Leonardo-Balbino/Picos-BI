import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

const PAGE_SIZE_PADRAO = 10
/** Teto rígido — impede varredura completa da tabela num único request (seção 4 do documento
 * de padrões). Quem precisar de mais do que isso deveria paginar de verdade, não aumentar isto. */
const PAGE_SIZE_MAXIMO = 100

/**
 * Base reaproveitável por todo domínio que precisar paginar — nunca duplicar `page`/`pageSize`
 * em cada query DTO (seção 4 do documento de padrões). Cada domínio estende esta classe com
 * seus próprios filtros (ex.: `busca`).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: '1-based.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @ApiPropertyOptional({ minimum: 1, maximum: PAGE_SIZE_MAXIMO, default: PAGE_SIZE_PADRAO })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGE_SIZE_MAXIMO)
  pageSize: number = PAGE_SIZE_PADRAO
}
