import { Controller, Get } from '@nestjs/common'
import { ApiExcludeEndpoint } from '@nestjs/swagger'
import { Public } from '../common/decorators/public.decorator'

/** Marcado `@Public()` — healthcheck (Docker, load balancer) não pode depender da chave de API. */
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiExcludeEndpoint()
  verificar(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
