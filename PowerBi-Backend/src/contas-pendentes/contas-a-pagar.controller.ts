import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { ContaPendenteResponseDto } from './dto/conta-pendente-response.dto'
import { ContasPendentesQueryDto } from './dto/contas-pendentes-query.dto'
import { ContasPendentesService } from './contas-pendentes.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('contas-a-pagar')
@ApiSecurity('api-key')
@Controller('contas-a-pagar')
export class ContasAPagarController {
  constructor(private readonly contasPendentesService: ContasPendentesService) {}

  @Get('painel')
  @ApiOperation({ summary: 'Painel analítico completo de contas a pagar com KPIs, fluxo e itens.' })
  painel(
    @Query() query: ContasPendentesQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ) {
    return this.contasPendentesService.painel('PAGAR', query, usuario)
  }

  @Get()
  @ApiOperation({ summary: 'Contas a pagar ainda pendentes — substitui GET /conta-pagar/pendentes/v1.' })
  @ApiOkResponse({ type: [ContaPendenteResponseDto] })
  listar(
    @Query() query: ContasPendentesQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<ContaPendenteResponseDto[]> {
    return this.contasPendentesService.listar('PAGAR', query, usuario)
  }
}
