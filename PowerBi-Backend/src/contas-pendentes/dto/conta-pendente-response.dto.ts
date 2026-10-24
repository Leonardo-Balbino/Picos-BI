import { ApiProperty } from '@nestjs/swagger'

export class ContaPendenteResponseDto {
  @ApiProperty()
  idDocumento!: string

  @ApiProperty()
  numero!: string

  @ApiProperty()
  nome!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty({ description: 'YYYY-MM-DD' })
  dtLancamento!: string

  @ApiProperty({ description: 'YYYY-MM-DD' })
  dtVencimento!: string

  @ApiProperty({ nullable: true, description: 'YYYY-MM-DD' })
  dtPagamento!: string | null

  @ApiProperty()
  valOrigem!: number

  @ApiProperty()
  valPago!: number

  @ApiProperty()
  valDesconto!: number

  @ApiProperty()
  valSaldo!: number

  @ApiProperty()
  status!: string
}
