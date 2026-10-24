import { ApiProperty } from '@nestjs/swagger'

export class PagamentoResponseDto {
  @ApiProperty()
  idPagamento!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty()
  valor!: number
}
