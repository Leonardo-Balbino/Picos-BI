import { ApiProperty } from '@nestjs/swagger'

export class ProdutoResponseDto {
  @ApiProperty()
  codigoMercadoriaVariacao!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty()
  codigoBarras!: string

  @ApiProperty()
  referenciaMercadoria!: string

  @ApiProperty()
  embalagem!: string

  @ApiProperty()
  idMarca!: string

  @ApiProperty()
  qtdEstoqueMinimo!: number

  @ApiProperty()
  qtdEstoqueMaximo!: number

  @ApiProperty()
  ativo!: boolean
}
