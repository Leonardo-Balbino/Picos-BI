import { EstoqueAlertasService } from './estoque-alertas.service'
import { EstoqueUrgenciaQueryDto } from './dto/estoque-urgencia-query.dto'
import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { EstoqueResumoResponseDto } from './dto/estoque-resumo-response.dto'
import { EstoqueService } from './estoque.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('estoque')
@ApiSecurity('api-key')
@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService, private readonly alertas: EstoqueAlertasService) {}

  @Get('urgencia')
  @ApiOperation({ summary: 'Saldo disponível e alertas por produto, com isolamento por unidade.' })
  urgencia(@Query() query: EstoqueUrgenciaQueryDto, @CurrentUser() usuario?: UsuarioToken) {
    return this.alertas.listar(query, usuario)
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Total em estoque e locais — substitui GET /local-estoque/*.' })
  @ApiQuery({ name: 'idLoja', required: false, description: 'Filtra por ID da loja' })
  @ApiOkResponse({ type: EstoqueResumoResponseDto })
  resumo(
    @CurrentUser() usuario?: UsuarioToken,
    @Query('idLoja') idLoja?: string,
  ): Promise<EstoqueResumoResponseDto> {
    return this.estoqueService.resumo(usuario, idLoja)
  }
}
