import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsOptional } from 'class-validator'
import { TransformEmptyStringToUndefined } from '../../common/decorators/empty-string-to-undefined.decorator'

/**
 * `inicio`/`fim` opcionais aqui de propósito (diferente de `PeriodoQueryDto`): esta entidade
 * não tem janela de 365 dias (seção 2.3 do prompt de geração deste backend) — sem filtro,
 * devolve tudo que ainda está em aberto, não importa a data de vencimento.
 */
export class ContasPendentesQueryDto {
  @ApiPropertyOptional({ example: '2026-05-01', description: 'Filtra por dtVencimento >= inicio.' })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  @IsDateString({ strict: true })
  inicio?: string

  @ApiPropertyOptional({ example: '2026-07-30', description: 'Filtra por dtVencimento <= fim.' })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  @IsDateString({ strict: true })
  fim?: string

  @ApiPropertyOptional({ description: 'Filtra por ID da loja.' })
  @IsOptional()
  @TransformEmptyStringToUndefined()
  idLoja?: string
}

