import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'
import { TransformEmptyStringToUndefined } from '../../common/decorators/empty-string-to-undefined.decorator'

export class ClientesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por razão social, fantasia ou CNPJ/CPF (contém).' })
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

