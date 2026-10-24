# Migração — VPS própria → VPS consolidada multi-cliente

> Este documento acompanha a adaptação deste backend ao padrão consolidado (Postgres
> central, Caddy, múltiplos clientes numa mesma VPS), usando `Picos-gestao-back` como
> repositório-gabarito. Ver `MIGRACAO.md` daquele projeto para o raciocínio completo
> por trás de cada decisão — este documento registra só as adaptações específicas
> deste cliente e o que já era diferente antes da migração.

---

## Nota de nomenclatura — leia antes de mexer em qualquer domínio/rede

Este cliente tem **três nomes diferentes**, cada um com motivo próprio, e isso não é
inconsistência a corrigir nesta rodada — é o estado real do projeto:

- **Pasta do repositório**: `PowerBi-Backend`.
- **Produto real, como o próprio código se identifica**: "PICOS Analytics" —
  `package.json` (`picos-analytics-backend`), banco (`picos_analytics`), título do
  Swagger ("PICOS Analytics — Backend de Sincronização").
- **Nome de infra deste cliente na VPS consolidada**: `powerbi` (rede `net_powerbi`,
  domínio a decidir) — assim que veio especificado no plano de migração maior.

Escolhas feitas nesta rodada, para não misturar os três sem necessidade:

- Nome do banco: mantido `picos_analytics` (não teria ganho nenhum trocar, e quebraria
  referência com o histórico do projeto).
- Role de banco / container / imagem publicada: usam o nome do **produto**
  (`powerbi_app` só a role, por consistência com a rede `net_powerbi` já decidida
  — mas a imagem publicada é `picos-analytics`, o nome real do software).
- Rede/domínio: `net_powerbi` / `<DOMINIO_POWERBI>`, conforme já especificado no plano
  de migração maior.

Se em algum momento isso for renomeado de propósito (ex.: o cliente final passar a se
chamar só "PICOS Analytics" também na infra), é uma decisão a tomar explicitamente, não
um efeito colateral desta padronização.

---

## Status

Trabalho feito **inteiramente local** nesta rodada — nenhum comando rodou contra o
Postgres de produção, nenhuma imagem foi publicada, nenhuma VPS foi tocada.

| Item | Arquivo(s) | Status |
|---|---|---|
| `db/provisionar-cliente.sql` | `db/provisionar-cliente.sql` | ✅ |
| `caddy/snippet.conf` | `caddy/snippet.conf` | ✅ |
| `docker-compose.prod.yml` | `docker-compose.prod.yml` | ✅ (inclui Redis local — ver seção abaixo) |
| Dockerfile — hardening completo | `Dockerfile` | ✅ (já era non-root/multi-stage; faltavam `TZ`, `HEALTHCHECK` e `tzdata`/`curl` — adicionados) |
| `env.validation.ts` estrito | `src/config/env.validation.ts` | ✅ (já estava no padrão antes desta rodada — nenhuma mudança necessária) |
| Prisma retry+backoff | `src/prisma/prisma.service.ts`, `src/common/utils/retry-com-backoff.util.ts` | ✅ (não existia nenhum retry antes) |
| Seed bloqueado em prod | — | N/A — este projeto não tem script de seed (nenhum `prisma/seed.ts`) |
| Redação de log (allowlist) | `src/common/utils/redacao-log.util.ts`, `src/common/interceptors/log-redaction.interceptor.ts`, `src/common/filters/http-exception.filter.ts` | ✅ (não existia nenhuma antes) |
| `.github/workflows/build-push.yml` | `.github/workflows/build-push.yml` | ✅ (não existia workflow nenhum antes — nem de CI) |

Faltam, fora do escopo desta rodada de padronização de arquivos:

- [ ] Placeholders (`<GITHUB_ORG>`, `<DOMINIO_POWERBI>`) — substituídos num passo único
      antes do primeiro deploy real.
- [ ] Provisionamento de verdade no Postgres central — só depois que a VPS existir.
- [ ] Simulação local ponta a ponta — pendente.
- [ ] CI de lint/teste (fora do escopo desta migração — mas vale registrar que este
      repositório não tinha nenhum antes, nem para PR).

---

## Redis continua local a este cliente — decisão já tomada, aplicada aqui

A migração consolidada decidiu que Redis **não** vira um serviço central multi-tenant
(diferente do Postgres) — cada cliente que precisa mantém o seu próprio container,
preso à rede `net_<cliente>`, sem porta publicada. `docker-compose.prod.yml` deste
repositório sobe um serviço `redis` próprio, com o mesmo `--save '' --appendonly no`
já usado em dev (cache é inteiramente reconstruível a partir do Postgres — perder o
volume do Redis não é incidente).

## Dockerfile — gaps que não apareceram na Fase 2 (achados nesta rodada)

A análise da Fase 2 (documento externo a este repositório) tinha listado o Dockerfile
como "✅ já no padrão", mas ao abrir o arquivo de verdade para editar, dois itens do
gabarito estavam faltando (a comparação da Fase 2 tinha sido superficial, sem checar
`HEALTHCHECK`/`TZ` linha a linha neste arquivo específico):

- **Sem `HEALTHCHECK`** — adicionado, batendo em `GET /api/v1/health` (`@Public()`,
  não depende de credencial).
- **Sem `TZ` nenhum** (nem `UTC` nem outro) — o container rodava no fuso default da
  imagem base. Adicionado `TZ=America/Sao_Paulo` + `tzdata`, mesmo padrão dos demais
  clientes.

O restante já estava correto: multi-stage, non-root (`nestjs`), sem devDependencies
na imagem final.

## Prisma retry+backoff e redação de log — não existiam, criados do zero

Diferente da Antares (que já tinha metade do padrão), este repositório não tinha
nenhum dos dois:

- `PrismaService.onModuleInit()` chamava `$connect()` direto, sem retry — na infra
  consolidada (Postgres central fora desta stack, sem `depends_on:
  condition: service_healthy`), isso quebraria o boot na primeira oscilação do banco.
- Nenhum interceptor/filtro redigia log nenhum — `HttpExceptionFilter` já existia
  (formata toda resposta de erro num payload único, incluindo o log do 5xx), mas
  logava só `method/url/stack`, nunca o corpo da requisição — o que é seguro por
  omissão, mas também menos observável. Adicionar o corpo redigido ao log de erro
  aumenta a observabilidade sem reintroduzir o risco (mesmo raciocínio do Picos:
  "aumento de observabilidade, não só segurança").

---

## Placeholders usados

| Placeholder | Onde aparece | Substituir por |
|---|---|---|
| `<GITHUB_ORG>` | `docker-compose.prod.yml` | Organização/usuário real do GitHub — o `build-push.yml` já resolve isso sozinho via `github.repository_owner`, só o compose de produção precisa de edição manual. |
| `<DOMINIO_POWERBI>` | `caddy/snippet.conf` | Domínio/hostname real deste cliente na VPS consolidada. |

Definitivos (já decididos, não são placeholder):

- Hostname do Postgres central: `postgres-central`.
- Rede externa do cliente: `net_powerbi`.
- Banco: `picos_analytics` (mantido). Usuário da aplicação: `powerbi_app` (novo).
- Nome do projeto Compose de produção: `picos-analytics` (fixado via `name:` em
  `docker-compose.prod.yml`) — ver nota de nomenclatura acima.
- Este cliente **não tem volume de uploads** (não recebe arquivo do usuário) — só o
  dump do Postgres central precisa entrar no backup do repositório de infra.
