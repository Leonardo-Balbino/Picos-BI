import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

/**
 * Base reaproveitável por todo domínio com janela de 365 dias (vendas, itens vendidos,
 * comissões) — nunca duplicar `inicio`/`fim` em cada query DTO. Formato `YYYY-MM-DD` (data de
 * domínio, seção 4 do documento de padrões) — `IsDateString({ strict: true })` já rejeita
 * qualquer coisa com componente de hora, então não tem ambiguidade de fuso na entrada.
 */
export class PeriodoQueryDto {
  @ApiProperty({ example: '2026-05-01', description: 'YYYY-MM-DD, inclusive.' })
  @IsDateString({ strict: true })
  inicio!: string

  @ApiProperty({ example: '2026-07-30', description: 'YYYY-MM-DD, inclusive.' })
  @IsDateString({ strict: true })
  fim!: string
}
