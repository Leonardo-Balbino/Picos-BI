import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { TransformEmptyStringToUndefined } from '../../common/decorators/empty-string-to-undefined.decorator'

export class ProdutosQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por descrição ou código de barras (contém, sem diferenciar maiúsculas).',
  })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  @IsString()
  busca?: string

  @ApiPropertyOptional({ description: 'Filtra por ID da loja.' })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  @IsString()
  idLoja?: string
}

