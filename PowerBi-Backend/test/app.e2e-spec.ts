import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { configurarApp } from '../src/bootstrap.config'

/**
 * e2e por fluxo (seção 11 do documento de padrões), não por endpoint isolado: sobe a aplicação
 * inteira contra um Postgres real (ver README — precisa de `DATABASE_URL` apontando pra um
 * banco com a migration aplicada) e testa o fluxo "requisição HTTP -> guard -> validation pipe
 * -> exception filter -> resposta", que é exatamente o que nenhum teste unitário sozinho cobre.
 */
describe('AppModule (e2e)', () => {
  let app: INestApplication
  const chaveValida = process.env.BACKEND_API_KEY!

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

    app = moduleRef.createNestApplication()
    configurarApp(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('healthcheck', () => {
    it('GET /api/v1/health responde 200 sem chave de API — rota pública', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/v1/health')
      expect(resposta.status).toBe(200)
      expect(resposta.body.status).toBe('ok')
    })
  })

  describe('guard global fechado por padrão', () => {
    it('rejeita uma rota protegida sem X-API-Key com 401 no formato de erro único', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/v1/produtos')

      expect(resposta.status).toBe(401)
      expect(resposta.body).toEqual({ error: { code: 'UNAUTHORIZED', message: expect.any(String) } })
    })

    it('rejeita uma X-API-Key errada com 401', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/produtos')
        .set('X-API-Key', 'chave-errada')

      expect(resposta.status).toBe(401)
    })

    it('aceita a X-API-Key correta', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/produtos')
        .set('X-API-Key', chaveValida)

      expect(resposta.status).toBe(200)
      expect(resposta.body).toEqual({
        items: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        pageSize: 10,
      })
    })
  })

  describe('ValidationPipe global', () => {
    it('rejeita GET /api/v1/vendas sem "inicio"/"fim" com 400 e os campos faltantes listados', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/v1/vendas').set('X-API-Key', chaveValida)

      expect(resposta.status).toBe(400)
      expect(resposta.body.error.code).toBe('VALIDATION_ERROR')
      expect(resposta.body.error.fields).toEqual(
        expect.objectContaining({ inicio: expect.any(String), fim: expect.any(String) }),
      )
    })

    it('rejeita um campo de query não declarado no DTO (forbidNonWhitelisted)', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/produtos?campoQueNaoExiste=1')
        .set('X-API-Key', chaveValida)

      expect(resposta.status).toBe(400)
    })
  })

  describe('janela de sincronização', () => {
    it('rejeita GET /api/v1/vendas com período mais largo que a janela mantida, com 422', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/v1/vendas')
        .query({ inicio: '2000-01-01', fim: '2026-07-19' })
        .set('X-API-Key', chaveValida)

      expect(resposta.status).toBe(422)
      expect(resposta.body.error.code).toBe('FORA_DA_JANELA_DISPONIVEL')
    })
  })

  describe('documentação Swagger', () => {
    it('GET /api/v1/docs é pública e responde 200', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/v1/docs')
      expect(resposta.status).toBe(200)
    })
  })
})
