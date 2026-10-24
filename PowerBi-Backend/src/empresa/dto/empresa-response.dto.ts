import { ApiProperty } from '@nestjs/swagger'

export class EmpresaResponseDto {
  @ApiProperty()
  fantasia!: string

  @ApiProperty()
  razaoSocial!: string

  @ApiProperty()
  cnpjCpf!: string

  @ApiProperty()
  municipio!: string

  @ApiProperty()
  uf!: string

  @ApiProperty({ nullable: true })
  logo!: string | null
}
