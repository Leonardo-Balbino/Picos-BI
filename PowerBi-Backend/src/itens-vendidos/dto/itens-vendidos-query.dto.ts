import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PeriodoQueryDto } from '../../common/dto/periodo-query.dto'
import { TransformEmptyStringToUndefined } from '../../common/decorators/empty-string-to-undefined.decorator'

export class ItensVendidosQueryDto extends PeriodoQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por ID da loja — sem filtro = todas as lojas autorizadas.' })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  @IsString()
  idLoja?: string

  @IsOptional()
  @IsString()
  idsLojas?: string
}
