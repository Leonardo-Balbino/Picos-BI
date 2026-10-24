import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { ItensVendidosQueryDto } from './dto/itens-vendidos-query.dto'
import { ItemVendidoResponseDto } from './dto/item-vendido-response.dto'
import { ItensVendidosService } from './itens-vendidos.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('itens-vendidos')
@ApiSecurity('api-key')
@Controller('itens-vendidos')
export class ItensVendidosController {
  constructor(private readonly itensVendidosService: ItensVendidosService) {}

  @Get()
  @ApiOperation({
    summary: 'Itens vendidos somados no período — substitui GET /documento/mercadorias-vendidas/v1.',
  })
  @ApiOkResponse({ type: [ItemVendidoResponseDto] })
  listar(
    @Query() query: ItensVendidosQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<ItemVendidoResponseDto[]> {
    return this.itensVendidosService.listarPeriodo(query.inicio, query.fim, query.idLoja, usuario, query.idsLojas)
  }
}
