# PICOS Analytics

BI de vendas para empresas parceiras da revenda PICOS Sistemas, consumindo (somente leitura) a API Pública Meu ERP Online.

## Configuração

```bash
cp .env.example .env
npm install
npm run dev
```

Preencha o `.env`:

- `VITE_API_BASE_URL` — em dev, deixe como `/publica` (caminho relativo). O `vite.config.ts` tem um proxy que repassa `/publica/*` para `https://api.meuerponline.com.br` por baixo dos panos.
- `VITE_API_TOKEN` — token da empresa, usado como `Authorization: Authentication {token}`.
- `VITE_GOOGLE_CLIENT_ID` — Client ID do Google Identity Services usado no login.
- `VITE_ALLOWED_EMAILS` — e-mails autorizados a entrar, separados por vírgula.

## CORS / preflight

A API da Meu ERP Online (IIS) não responde ao `OPTIONS` de preflight que o navegador dispara automaticamente por causa do header `Authorization` customizado — isso derruba a chamada com 405 antes mesmo do `GET` sair. Por isso `VITE_API_BASE_URL` aponta para o caminho relativo `/publica`: o servidor de dev do Vite (`server.proxy` em `vite.config.ts`) enxerga a chamada como same-origin (sem preflight) e a repassa para a API real. **Isso só existe no `npm run dev`** — em produção, o build é estático e precisa de um proxy equivalente na frente dele (nginx, edge function, etc.) apontando `/publica` para a API real; sem isso, o mesmo 405 volta a acontecer.

## Segurança

Este é um app 100% front-end nesta fase: **todas as variáveis `VITE_*` (incluindo `VITE_API_TOKEN`) ficam embutidas no bundle publicado** — qualquer pessoa com acesso ao build consegue lê-las. Isso é aceitável para uso interno controlado (acesso restrito à revenda e às empresas parceiras), mas **não deve ser usado como está para uma exposição pública**. Para isso, o passo correto é introduzir um backend/proxy que guarde o token da API e nunca o exponha ao navegador — não implementado nesta fase (o proxy de dev acima resolve só o CORS, não esconde o token, que ainda vai embutido no bundle).

A camada `src/services/api.ts` só executa `GET`: não existe caminho de código que monte `POST`/`PUT`/`PATCH`/`DELETE` contra a API Meu ERP Online.

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — typecheck (`vue-tsc`) + build de produção.
- `npm run preview` — serve o build de produção localmente.
