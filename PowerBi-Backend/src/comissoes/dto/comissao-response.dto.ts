import { ApiProperty } from '@nestjs/swagger'

export class ComissaoResponseDto {
  @ApiProperty()
  nomeFuncionario!: string

  @ApiProperty()
  valTotalLiquido!: number

  @ApiProperty()
  valTotalComissao!: number
}
