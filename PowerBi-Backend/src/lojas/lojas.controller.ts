import { Body, Controller, ForbiddenException, Get, Param, Post, Put } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger'
import { LojasService } from './lojas.service'
import { LojaResponseDto } from './dto/loja-response.dto'
import { CriarLojaDto } from './dto/criar-loja.dto'
import { AtualizarLojaDto } from './dto/atualizar-loja.dto'
import { FranqueadoResponseDto } from './dto/franqueado-response.dto'
import { VincularLojasDto } from './dto/vincular-lojas.dto'
import { CriarFranqueadoDto } from './dto/criar-franqueado.dto'
import { CurrentUser, type UsuarioToken } from '../common/decorators/current-user.decorator'

@ApiTags('lojas')
@ApiSecurity('api-key')
@Controller('lojas')
export class LojasController {
  constructor(private readonly lojasService: LojasService) {}

  @Get()
  @ApiOperation({ summary: 'Lista lojas disponíveis para o usuário (multiloja com RLS)' })
  @ApiOkResponse({ type: [LojaResponseDto] })
  listar(@CurrentUser() usuario?: UsuarioToken): Promise<LojaResponseDto[]> {
    return this.lojasService.listar(usuario)
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova loja na rede (apenas Matriz/Admin)' })
  @ApiOkResponse({ type: LojaResponseDto })
  criar(
    @Body() dto: CriarLojaDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<LojaResponseDto> {
    if (usuario && usuario.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores da Matriz podem cadastrar lojas.')
    }
    return this.lojasService.criar(dto)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualiza dados de uma loja existente (apenas Matriz/Admin)' })
  @ApiOkResponse({ type: LojaResponseDto })
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarLojaDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<LojaResponseDto> {
    if (usuario && usuario.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores da Matriz podem atualizar lojas.')
    }
    return this.lojasService.atualizar(id, dto)
  }

  @Get('franqueados')
  @ApiOperation({ summary: 'Lista usuários franqueados e suas lojas vinculadas (apenas Matriz/Admin)' })
  @ApiOkResponse({ type: [FranqueadoResponseDto] })
  listarFranqueados(@CurrentUser() usuario?: UsuarioToken): Promise<FranqueadoResponseDto[]> {
    if (usuario && usuario.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores da Matriz podem listar franqueados.')
    }
    return this.lojasService.listarFranqueados()
  }

  @Post('franqueados')
  @ApiOperation({ summary: 'Cadastra um novo usuário franqueado (apenas Matriz/Admin)' })
  @ApiOkResponse({ type: FranqueadoResponseDto })
  criarFranqueado(
    @Body() dto: CriarFranqueadoDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<FranqueadoResponseDto> {
    if (usuario && usuario.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores da Matriz podem cadastrar franqueados.')
    }
    return this.lojasService.criarFranqueado(dto)
  }

  @Put('franqueados/:id/lojas')
  @ApiOperation({ summary: 'Atualiza o vínculo de lojas de um usuário franqueado (apenas Matriz/Admin)' })
  @ApiOkResponse({ type: FranqueadoResponseDto })
  vincularLojas(
    @Param('id') id: string,
    @Body() dto: VincularLojasDto,
    @CurrentUser() usuario?: UsuarioToken,
  ): Promise<FranqueadoResponseDto> {
    if (usuario && usuario.perfil !== 'ADMIN') {
      throw new ForbiddenException('Apenas administradores da Matriz podem vincular lojas a franqueados.')
    }
    return this.lojasService.vincularLojas(id, dto)
  }
}
