import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { SyncStatusResponseDto } from './dto/sync-status-response.dto'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'
import { SyncService } from './sync.service'

@ApiTags('sync')
@ApiSecurity('api-key')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('atualizacao')
  atualizacao(@Query('idsLojas') idsLojas = '', @CurrentUser() usuario?: UsuarioToken) {
    return this.syncService.atualizacao(idsLojas.split(',').filter(Boolean), usuario)
  }

  @Get('status')
  @ApiOperation({
    summary: 'Última sincronização de cada entidade — pro front exibir "dados atualizados até HH:mm".',
  })
  @ApiOkResponse({ type: SyncStatusResponseDto })
  status(@Query('idLoja') idLoja?: string, @CurrentUser() usuario?: UsuarioToken): Promise<SyncStatusResponseDto> {
    return this.syncService.status(idLoja, usuario)
  }
}
