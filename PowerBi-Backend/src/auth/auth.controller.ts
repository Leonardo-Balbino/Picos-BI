import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthService, RespostaLogin, UsuarioAutenticado } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { Public } from '../common/decorators/public.decorator'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticação segura de usuário por e-mail e senha (JWT).' })
  @ApiResponse({ status: 200, description: 'Token de acesso gerado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  async login(@Body() dto: LoginDto): Promise<RespostaLogin> {
    return this.authService.login(dto)
  }

  @Get('me')
  @ApiOperation({ summary: 'Obtém os dados do usuário autenticado a partir do token JWT.' })
  @ApiResponse({ status: 200, description: 'Dados do perfil do usuário logado.' })
  async me(@Headers('authorization') authHeader?: string): Promise<UsuarioAutenticado> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Token de autenticação ausente.',
      })
    }
    const token = authHeader.replace('Bearer ', '').trim()
    return this.authService.verificarToken(token)
  }
}
