import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'

export class AtualizarLojaDto {
  @ApiPropertyOptional({ description: 'Nome da loja' })
  @IsOptional()
  @IsString()
  nome?: string

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

  @ApiPropertyOptional({ description: 'Indica se a loja está ativa' })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean
}
