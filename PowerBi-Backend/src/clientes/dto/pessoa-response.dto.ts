import { ApiProperty } from '@nestjs/swagger'

export class ContatoResponseDto {
  @ApiProperty({ nullable: true })
  fone!: string | null

  @ApiProperty({ nullable: true })
  celular!: string | null

  @ApiProperty({ nullable: true })
  email!: string | null
}

/** Mesmo shape aninhado que o front já conhece (`frontend/src/types/index.ts`, interface
 * `Pessoa`, campo `contato`) — mantém a troca de base URL do front sem reescrever mapeamento. */
export class PessoaResponseDto {
  @ApiProperty()
  codigo!: string

  @ApiProperty()
  razaoSocial!: string

  @ApiProperty()
  fantasia!: string

  @ApiProperty()
  tipo!: string

  @ApiProperty()
  cnpjCpf!: string

  @ApiProperty()
  dataCadastro!: string

  @ApiProperty()
  ativo!: boolean

  @ApiProperty({ type: ContatoResponseDto })
  contato!: ContatoResponseDto

  @ApiProperty({ nullable: true })
  uf!: string | null
}
