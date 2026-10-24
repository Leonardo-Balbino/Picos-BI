import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { FormaPagamentoResponseDto } from './dto/forma-pagamento-response.dto'
import { FormasPagamentoService } from './formas-pagamento.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('formas-pagamento')
@ApiSecurity('api-key')
@Controller('formas-pagamento')
export class FormasPagamentoController {
  constructor(private readonly formasPagamentoService: FormasPagamentoService) {}

  @Get()
  @ApiOperation({ summary: 'Dimensão de formas de pagamento — substitui GET /pagamento/v1.' })
  @ApiQuery({ name: 'idLoja', required: false, description: 'Filtra por ID da loja' })
  @ApiOkResponse({ type: [FormaPagamentoResponseDto] })
  listar(
    @CurrentUser() usuario?: UsuarioToken,
    @Query('idLoja') idLoja?: string,
  ): Promise<FormaPagamentoResponseDto[]> {
    return this.formasPagamentoService.listar(usuario, idLoja)
  }
}
