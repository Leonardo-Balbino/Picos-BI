import { ApiProperty } from '@nestjs/swagger'

export class SyncStatusItemDto {
  @ApiProperty()
  entidade!: string

  @ApiProperty()
  status!: 'SUCESSO' | 'ERRO'

  @ApiProperty({ description: 'ISO 8601 UTC — quando essa entidade foi sincronizada pela última vez.' })
  executadoEm!: string

  @ApiProperty({
    nullable: true,
    description: 'YYYY-MM-DD — nulo pra entidades snapshot, sem granularidade diária.',
  })
  dataReferencia!: string | null

  @ApiProperty()
  registrosProcessados!: number

  @ApiProperty({ nullable: true })
  erro!: string | null
}

export class SyncStatusResponseDto {
  @ApiProperty({ type: [SyncStatusItemDto] })
  entidades!: SyncStatusItemDto[]
}
