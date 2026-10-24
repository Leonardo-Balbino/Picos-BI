import { ContasReceberClientesService } from './contas-receber-clientes.service'
import { ContasReceberPainelService } from './contas-receber-painel.service'
import { ContasReceberPainelQueryDto } from './dto/contas-receber-painel-query.dto'
import { Controller, Get, Query, Param } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { ContaPendenteResponseDto } from './dto/conta-pendente-response.dto'
import { ContasPendentesQueryDto } from './dto/contas-pendentes-query.dto'
import { ContasPendentesService } from './contas-pendentes.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('contas-a-receber')
@ApiSecurity('api-key')
@Controller('contas-a-receber')
export class ContasAReceberController {
  constructor(
    private readonly contasPendentesService: ContasPendentesService,
    private readonly painelService: ContasReceberPainelService,
    private readonly clientes: ContasReceberClientesService,
  ) {}

  @Get('painel')
  @ApiOperation({ summary: 'Painel analítico completo de contas a receber com KPIs, fluxo e itens.' })
  painel(@Query() query: ContasPendentesQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.contasPendentesService.painel('RECEBER', query, usuario)
  }

  @Get('pagina')
  @ApiOperation({ summary: 'Contas com saldo em aberto, filtros por cliente/valor e paginação.' })
  pagina(@Query() query: ContasReceberPainelQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.painelService.pagina(query, usuario)
  }

  @Get('clientes')
  @ApiOperation({ summary: 'Dívida agrupada por cliente e unidade, filtros sobre o saldo total.' })
  porCliente(@Query() query: ContasReceberPainelQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.clientes.pagina(query, usuario)
  }

  @Get('clientes/:id/parcelas')
  @ApiOperation({ summary: 'Parcelas em aberto do cliente, limitadas à empresa autorizada.' })
  parcelas(@Param('id') id: string, @Query() query: ContasReceberPainelQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.clientes.parcelas(id, query, usuario)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da conta e cliente, limitado às unidades autorizadas.' })
  detalhe(@Param('id') id: string, @CurrentUser() usuario?: UsuarioToken) {
    return this.painelService.detalhe(id, usuario)
  }

  @Get()
  @ApiOperation({ summary: 'Contas a receber ainda pendentes — substitui GET /conta-receber/pendentes/v1.' })
  @ApiOkResponse({ type: [ContaPendenteResponseDto] })
  listar(
    @Query() query: ContasPendentesQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<ContaPendenteResponseDto[]> {
    return this.contasPendentesService.listar('RECEBER', query, usuario)
  }
}
