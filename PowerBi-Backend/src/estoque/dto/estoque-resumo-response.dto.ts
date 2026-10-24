import { ApiProperty } from '@nestjs/swagger'

export class LocalEstoqueResponseDto {
  @ApiProperty()
  codigo!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty()
  ativo!: boolean
}

export class EstoqueResumoResponseDto {
  @ApiProperty({ description: 'Soma de `qtdSaldo` positivo em todos os locais ativos.' })
  totalItens!: number

  @ApiProperty({
    description: 'false quando a última sincronização de saldo falhou — mesmo fallback do front.',
  })
  disponivel!: boolean

  @ApiProperty({ type: [LocalEstoqueResponseDto] })
  locais!: LocalEstoqueResponseDto[]
}
