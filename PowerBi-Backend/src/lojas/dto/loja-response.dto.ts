import { ApiProperty } from '@nestjs/swagger'

export class LojaResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  idOrganizacao!: string

  @ApiProperty()
  nome!: string

  @ApiProperty()
  codigo!: string

  @ApiProperty({ nullable: true })
  cnpj!: string | null

  @ApiProperty({ nullable: true })
  cidade!: string | null

  @ApiProperty({ nullable: true })
  uf!: string | null

  @ApiProperty()
  ativo!: boolean

  @ApiProperty({ nullable: true })
  idEmpresaErp!: number | null
}
