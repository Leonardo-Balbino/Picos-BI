import { ApiProperty } from '@nestjs/swagger'

export class FormaPagamentoResponseDto {
  @ApiProperty()
  codigo!: string

  @ApiProperty()
  descricao!: string

  @ApiProperty()
  idTipo!: string

  @ApiProperty()
  tipoDescricao!: string

  @ApiProperty()
  aVista!: boolean

  @ApiProperty()
  ativo!: boolean
}
