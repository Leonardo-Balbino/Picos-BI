import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { VendasService } from './vendas.service'
import { DreService } from './dre.service'
import { VendasQueryDto } from './dto/vendas-query.dto'
import { VendasPaginaQueryDto } from './dto/vendas-pagina-query.dto'
import { VendasResumoQueryDto } from './dto/vendas-resumo-query.dto'
import { VendaResponseDto } from './dto/venda-response.dto'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('vendas')
@ApiSecurity('api-key')
@Controller('vendas')
export class VendasController {
  constructor(
    private readonly vendasService: VendasService,
    private readonly dreService: DreService,
  ) {}

  @Get('dre')
  @ApiOperation({ summary: 'Demonstrativo do Resultado do Exercício consolidado com comparativo de períodos.' })
  dre(
    @Query('inicio') inicio: string,
    @Query('fim') fim: string,
    @Query('inicioAnterior') inicioAnterior?: string,
    @Query('fimAnterior') fimAnterior?: string,
    @Query('idsLojas') idsLojas?: string,
    @CurrentUser() usuario?: UsuarioToken,
  ) {
    return this.dreService.calcular(inicio, fim, inicioAnterior, fimAnterior, idsLojas, usuario)
  }

  @Get('vendedores')
  @ApiOperation({ summary: 'Valor dos itens e quantidade de vendas por vendedor responsável, no período e escopo autorizados.' })
  vendedores(@Query() query: VendasResumoQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.vendasService.vendedoresPeriodo(query.inicio, query.fim, query.idsLojas, query.idCaixa, usuario)
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Indicadores e séries compactas de vendas para gráficos do BI.' })
  resumo(@Query() query: VendasResumoQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.vendasService.resumoPeriodo(query.inicio, query.fim, query.idsLojas, query.idCaixa, usuario)
  }

  @Get('pagina')
  @ApiOperation({ summary: 'Vendas detalhadas paginadas para a tabela analítica.' })
  pagina(@Query() query: VendasPaginaQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.vendasService.listarPagina(
      query.inicio, query.fim, query.page, query.pageSize,
      query.busca, query.sort, query.direcao, query.idsLojas, query.idCaixa, usuario,
    )
  }

  @Get()
  @ApiOperation({ summary: 'Lista vendas válidas no período — substitui GET /documento/v1 direto no ERP.' })
  @ApiOkResponse({ type: [VendaResponseDto] })
  listar(
    @Query() query: VendasQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<VendaResponseDto[]> {
    return this.vendasService.listarPeriodo(query.inicio, query.fim, query.idCaixa, query.idLoja, usuario)
  }
}
