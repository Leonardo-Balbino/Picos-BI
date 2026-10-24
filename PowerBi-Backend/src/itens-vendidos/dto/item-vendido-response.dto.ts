import { ApiProperty } from '@nestjs/swagger'

export class ItemVendidoResponseDto {
  @ApiProperty()
  idMercadoriaVariacao!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty()
  qtd!: number

  @ApiProperty()
  valTotalLiquido!: number
}
