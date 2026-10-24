import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { ComissoesQueryDto } from './dto/comissoes-query.dto'
import { ComissoesService } from './comissoes.service'
import { ComissaoResponseDto } from './dto/comissao-response.dto'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('comissoes')
@ApiSecurity('api-key')
@Controller('comissoes')
export class ComissoesController {
  constructor(private readonly comissoesService: ComissoesService) {}

  @Get()
  @ApiOperation({
    summary: 'Comissões por funcionário no período — substitui GET /funcionario/comissoes/v1.',
  })
  @ApiOkResponse({ type: [ComissaoResponseDto] })
  listar(
    @Query() query: ComissoesQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<ComissaoResponseDto[]> {
    return this.comissoesService.listarPeriodo(query.inicio, query.fim, query.idLoja, usuario, query.idsLojas)
  }
}
