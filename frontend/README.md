# PICOS Analytics

BI de vendas para empresas parceiras da revenda PICOS Sistemas. Consome o [backend](../backend)
do PICOS Analytics — não fala mais direto com a API Meu ERP Online (o backend faz isso, em
segundo plano, e cacheia as leituras pesadas em Redis).

## Configuração

```bash
cp .env.example .env
npm install
npm run dev
```

Preencha o `.env`:

- `VITE_BACKEND_API_URL` — em dev, `http://localhost:3000/api/v1` (o backend rodando local, via
  `npm run start:dev` ou `docker compose --profile app --profile db up` — ver `../backend/README.md`).
- `VITE_BACKEND_API_KEY` — mesmo valor de `BACKEND_API_KEY` no `.env` do backend, vai no header
  `X-API-Key`.
- `VITE_GOOGLE_CLIENT_ID` — Client ID do Google Identity Services usado no login.
- `VITE_ALLOWED_EMAILS` — e-mails autorizados a entrar, separados por vírgula.

O backend já responde a preflight `OPTIONS` corretamente (CORS configurado com a origem do front
via `CORS_ORIGIN`), então não precisa de proxy de dev nem de rewrite em produção — diferente do
que era necessário quando o front chamava a API Meu ERP Online (IIS) direto.

## Segurança

`VITE_BACKEND_API_KEY` ainda é uma variável `VITE_*`, embutida no bundle publicado — qualquer
pessoa com acesso ao build consegue lê-la. Isso é aceitável pro mesmo cenário de uso interno
controlado de antes (acesso restrito à revenda e às empresas parceiras): a chave só abre a API
deste backend (que não expõe nada write, só leitura agregada), não o token real da Meu ERP
Online — esse agora fica só no backend, nunca chega ao navegador. Ver "Decisões que merecem
revisão" em `../backend/README.md` (item sobre auth por API key) se este modelo precisar
endurecer no futuro (ex.: JWT por usuário).

A camada `src/services/api.ts` só executa `GET`: não existe caminho de código que monte
`POST`/`PUT`/`PATCH`/`DELETE` contra o backend.

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — typecheck (`vue-tsc`) + build de produção.
- `npm run preview` — serve o build de produção localmente.
