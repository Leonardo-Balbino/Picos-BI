import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { PaginatedResponseDto, type Paginado } from '../common/dto/paginated-response.dto'
import { ProdutoResponseDto } from './dto/produto-response.dto'
import { ProdutosQueryDto } from './dto/produtos-query.dto'
import { ProdutosService } from './produtos.service'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

class ProdutosPaginadoResponseDto extends PaginatedResponseDto(ProdutoResponseDto) {}

@ApiTags('produtos')
@ApiSecurity('api-key')
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo de produtos, paginado — substitui GET /mercadoria/v1.' })
  @ApiOkResponse({ type: ProdutosPaginadoResponseDto })
  listar(
    @Query() query: ProdutosQueryDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<Paginado<ProdutoResponseDto>> {
    return this.produtosService.listar(query, usuario)
  }
}
