import { ApiProperty } from '@nestjs/swagger'
import { PagamentoResponseDto } from './pagamento-response.dto'

/** Nunca a entidade Prisma crua (seção 4 do documento de padrões) — mesmo shape que o front já
 * conhece (`frontend/src/types/index.ts`, interface `Venda`), pra a troca de base URL do front
 * não exigir reescrever o mapeamento client-side. */
export class VendaResponseDto {
  @ApiProperty()
  codigo!: string

  @ApiProperty()
  numero!: string

  @ApiProperty()
  serie!: string

  @ApiProperty()
  modelo!: string

  @ApiProperty()
  modeloDescricao!: string

  @ApiProperty()
  dataHora!: string

  @ApiProperty()
  dataHoraMovimento!: string

  @ApiProperty()
  idCaixa!: string

  @ApiProperty({ nullable: true, required: false })
  idLoja?: string | null

  @ApiProperty({ nullable: true, required: false })
  nomeLoja?: string | null

  @ApiProperty({ nullable: true })
  valTotal!: number | null

  @ApiProperty({ nullable: true, required: false, description: 'Custo real dos itens do documento; null quando incompleto.' })
  custoTotal?: number | null

  @ApiProperty()
  tipoMovimento!: string

  @ApiProperty()
  tipoMovimentoDescricao!: string

  @ApiProperty()
  tipoMovimentoFinanceiro!: string

  @ApiProperty()
  status!: string

  @ApiProperty()
  statusDescricao!: string

  @ApiProperty()
  nomeUsuario!: string

  @ApiProperty({ type: [PagamentoResponseDto] })
  pagamentos!: PagamentoResponseDto[]
}
