import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { VendasQueryDto } from './vendas-query.dto'

export class VendasResumoQueryDto extends VendasQueryDto {
  @ApiPropertyOptional({ description: 'IDs de loja separados por vírgula, após autorização do usuário.' })
  @IsOptional()
  @IsString()
  idsLojas?: string
}
