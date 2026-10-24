import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { PaginatedResponseDto, type Paginado } from '../common/dto/paginated-response.dto'
import { ClientesQueryDto } from './dto/clientes-query.dto'
import { PessoaResponseDto } from './dto/pessoa-response.dto'
import { ClientesService } from './clientes.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

class ClientesPaginadoResponseDto extends PaginatedResponseDto(PessoaResponseDto) {}

@ApiTags('clientes')
@ApiSecurity('api-key')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Clientes/fornecedores, paginado — substitui GET /pessoa/v1.' })
  @ApiOkResponse({ type: ClientesPaginadoResponseDto })
  listar(
    @Query() query: ClientesQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<Paginado<PessoaResponseDto>> {
    return this.clientesService.listar(query, usuario)
  }
}
