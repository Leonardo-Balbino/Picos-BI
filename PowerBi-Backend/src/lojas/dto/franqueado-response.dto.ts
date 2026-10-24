import { ApiProperty } from '@nestjs/swagger'
import { LojaResponseDto } from './loja-response.dto'

export class FranqueadoResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  nome!: string

  @ApiProperty()
  perfil!: string

  @ApiProperty()
  ativo!: boolean

  @ApiProperty({ type: [LojaResponseDto] })
  lojas!: LojaResponseDto[]
}
