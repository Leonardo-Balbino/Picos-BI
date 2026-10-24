import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator'

export class CriarLojaDto {
  @ApiProperty({ description: 'Nome da loja' })
  @IsString()
  @IsNotEmpty()
  nome!: string

  @ApiProperty({ description: 'Código único da loja (slug/identificador)' })
  @IsString()
  @IsNotEmpty()
  codigo!: string

  @ApiPropertyOptional({ description: 'CNPJ da loja' })
  @IsOptional()
  @IsString()
  cnpj?: string

  @ApiPropertyOptional({ description: 'Cidade' })
  @IsOptional()
  @IsString()
  cidade?: string

  @ApiPropertyOptional({ description: 'UF' })
  @IsOptional()
  @IsString()
  uf?: string

  @ApiPropertyOptional({ description: 'Token de integração com ERP Meu ERP Online para esta unidade' })
  @IsOptional()
  @IsString()
  erpToken?: string

  @ApiPropertyOptional({ description: 'ID da empresa no ERP Meu ERP Online' })
  @IsOptional()
  @IsInt()
  idEmpresaErp?: number

  @ApiPropertyOptional({ description: 'ID da organização controladora' })
  @IsOptional()
  @IsString()
  idOrganizacao?: string
}
