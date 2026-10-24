import * as Joi from 'joi'

/**
 * Schema único de variáveis de ambiente (seção 8 do documento de padrões) — o processo recusa
 * subir com mensagem clara se faltar uma obrigatória, em vez de falhar depois, no meio de um
 * request. `APP_ENV` é um nome dedicado, distinto de `NODE_ENV` — este último fica livre pro
 * efeito colateral padrão que frameworks/libs do ecossistema já esperam dele.
 */
export const envValidationSchema = Joi.object({
  APP_ENV: Joi.string().valid('dev', 'staging', 'prod').default('dev'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  // Segurança padrão (TTL curto): a invalidação real é por geração — bumpada no Redis assim que
  // uma sincronização termina com sucesso (ver `RedisService.bumparGeracao`) — o TTL aqui só
  // existe pra garantir que uma entrada nunca fique presa pra sempre se algum bump falhar.
  CACHE_TTL_SEGUNDOS: Joi.number().integer().min(1).default(3600),

  ERP_API_BASE_URL: Joi.string().uri().required(),
  ERP_API_TOKEN: Joi.string().min(1).required(),

  // Mínimo de 32 caracteres (seção 12 do documento de padrões) — gerar com `openssl rand -hex 32`.
  BACKEND_API_KEY: Joi.string().min(32).required(),

  CORS_ORIGIN: Joi.string().required(),

  SYNC_WINDOW_DIAS: Joi.number().integer().min(1).default(90),
  SYNC_WINDOW_PADRAO_DIAS: Joi.number().integer().min(1).default(90),
  SYNC_WINDOW_FATURAMENTO_DIAS: Joi.number().integer().min(1).default(365),

  JWT_SECRET: Joi.string().min(16).default('picos-analytics-jwt-super-secret-key-2026!'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
})

