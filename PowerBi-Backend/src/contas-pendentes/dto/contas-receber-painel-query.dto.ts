import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { EscopoLojasQueryDto } from '../../common/dto/escopo-lojas-query.dto'
export class ContasReceberPainelQueryDto extends EscopoLojasQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number) @IsInt() @Min(1) page: number = 1
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize: number = 20
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200) cliente?: string
  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) @Max(100000000000) valorMin?: number
  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) @Max(100000000000) valorMax?: number
  @ApiPropertyOptional()
  @IsOptional() @IsDateString({ strict: true }) inicio?: string
  @ApiPropertyOptional()
  @IsOptional() @IsDateString({ strict: true }) fim?: string
  @ApiPropertyOptional({ enum: ['todas', 'vencidas', 'hoje', 'a-vencer', 'parciais'] })
  @IsOptional() @IsIn(['todas', 'vencidas', 'hoje', 'a-vencer', 'parciais']) situacao?: string
  @ApiPropertyOptional({ enum: ['vencimento', 'saldo', 'cliente'] })
  @IsOptional() @IsIn(['vencimento', 'saldo', 'cliente']) ordenar?: string
  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional() @IsIn(['asc', 'desc']) direcao?: 'asc' | 'desc'
}
