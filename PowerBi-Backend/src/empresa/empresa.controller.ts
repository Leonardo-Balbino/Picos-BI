import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { EmpresaResponseDto } from './dto/empresa-response.dto'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'
import { EmpresaService } from './empresa.service'

@ApiTags('empresa')
@ApiSecurity('api-key')
@Controller('empresa')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  @Get()
  @ApiOperation({ summary: 'Dados cadastrais da empresa — substitui GET /empresa/v1.' })
  @ApiOkResponse({ type: EmpresaResponseDto })
  obter(@CurrentUser() usuario?: UsuarioToken, @Query('idLoja') idLoja?: string): Promise<EmpresaResponseDto> {
    return this.empresaService.obter(usuario, idLoja)
  }
}
