# PICOS Analytics — Backend

Fica entre o [front](../frontend) e a API pública **Meu ERP Online**: sincroniza uma **janela
rolante de 365 dias** de dados em segundo plano (Postgres) e serve isso de volta via REST rápido
— em vez do navegador bater direto, ao vivo, numa API com rate limit apertado toda vez que o
usuário troca o filtro de período.

## Por que este backend existe

A API Meu ERP Online tem um rate limit real (20 requisições de rajada, reposição de 20/min,
paginação de 100 em 100) e o front hoje consome ela **direto do navegador**. Pra um período
largo (365 dias, "Ano"), isso vira dezenas de chamadas sequenciais — o usuário espera isso
acontecer ao vivo toda vez que troca o filtro. Este backend faz esse trabalho uma vez, em
background, e responde ao front a partir do Postgres — instantâneo.

## Stack

NestJS + Prisma + Postgres + Redis, seguindo o documento de padrões "Base para Criação de Novos
Projetos — Backend REST (NestJS + Prisma)" à risca (estrutura de pastas por domínio, formato de
erro único, `ValidationPipe`/`ExceptionFilter`/guard globais, Swagger vivo, Docker multi-stage).

## Cache (Redis)

As leituras que agregam sobre a janela de 365 dias (`GET /vendas`, `/itens-vendidos`,
`/comissoes`, `/estoque/resumo`) são cacheadas — o Postgres já é rápido, mas essas rotas ainda
recalculam do zero a cada chamada; o Redis evita refazer o mesmo cálculo pra dois usuários (ou
dois filtros iguais) pedindo o mesmo período em sequência.

Invalidação **por geração**, não por apagar chave por chave nem por TTL curto: cada entidade
cacheada tem um contador (`geracao:<entidade>` no Redis) que o `SyncService` avança
(`RedisService.bumparGeracao`) assim que uma sincronização daquela entidade termina com sucesso.
A chave de cache embute a geração atual (`<entidade>:g<N>:<params>`) — quando ela avança, toda
chave da geração anterior fica inalcançável de uma vez, sem precisar conhecer previamente todas
as combinações de filtro que algum client já cacheou. Ver `src/redis/redis.service.ts`.

Falha aberta: se o Redis cair, `getOrSet` loga um aviso e calcula direto do Postgres — o cache é
uma otimização, não uma dependência dura. O BI continua respondendo (só mais devagar) mesmo sem
Redis no ar.

## Como rodar localmente

### Opção 1 — Postgres/Redis em Docker, API local (recomendado pra desenvolver)

```bash
cp .env.example .env
# preencher ERP_API_TOKEN (token real da empresa) e BACKEND_API_KEY (openssl rand -hex 32)

npm install
docker compose --profile db up -d      # Postgres + Redis
npm run prisma:deploy                  # aplica a migration
npm run start:dev                      # API em http://localhost:3000/api/v1
```

### Opção 2 — tudo em Docker (simula produção)

```bash
cp .env.example .env
# preencher ERP_API_TOKEN e BACKEND_API_KEY

docker compose --profile app --profile db up --build
```

Sobe Postgres, Redis e a própria API containerizada — a migration é aplicada automaticamente no
start do container (`Dockerfile`, `CMD`). API em `http://localhost:3000/api/v1`.

Documentação viva (Swagger) em `http://localhost:3000/api/v1/docs` — toda rota protegida exige
o header `X-API-Key` (botão "Authorize" no canto superior da página do Swagger).

### Primeira sincronização (backfill)

O backend não tem dado nenhum até rodar o backfill uma vez — ele preenche os 365 dias anteriores
completos, respeitando o rate limit do ERP (pode demorar; é um job de bootstrap em segundo
plano, não uma requisição de usuário esperando resposta):

```bash
npm run backfill
```

É idempotente e retomável: se cair no meio (ex.: token expirou, processo morreu), rodar de novo
só refaz os dias que ainda não têm um `SyncLog` de sucesso — nunca recomeça do zero. Depois do
backfill inicial, o job `@Cron('0 3 * * *')` dentro do próprio processo Nest mantém a janela em
dia sozinho (mesma lógica do backfill, então também se autocura se o processo ficar fora do ar
por alguns dias).

`GET /api/v1/sync/status` mostra a última sincronização de cada entidade — útil pro front expor
"dados atualizados até HH:mm" e pra depurar se algo parou de sincronizar.

### Testes

```bash
npm test        # unitário — mocka Prisma e o client do upstream, não precisa de Postgres
npm run test:e2e  # precisa de DATABASE_URL apontando pra um Postgres real com a migration aplicada
```

O e2e sobe a aplicação inteira (guard, `ValidationPipe`, `ExceptionFilter`, Swagger — ver
`src/bootstrap.config.ts`, compartilhado com `main.ts` pra nunca divergir) e testa via HTTP real
com `supertest`. Cobre: guard fechado por padrão (401 sem `X-API-Key`), validação de query
obrigatória (400 com `fields`), rejeição de período fora da janela de 365 dias (422), e que o
Swagger está no ar. **Rodado de verdade** durante o desenvolvimento deste backend contra um
Postgres 18 real (17 testes unitários + 8 e2e, todos verdes) — não é só "deveria funcionar".

## Estrutura

```
src/
├── vendas/                  # janela 90d — GET /documento/v1
├── itens-vendidos/          # janela 90d, bucket diário — GET /documento/mercadorias-vendidas/v1
├── comissoes/                # janela 90d, bucket diário — GET /funcionario/comissoes/v1
├── produtos/                 # snapshot — GET /mercadoria/v1
├── clientes/                  # snapshot — GET /pessoa/v1
├── formas-pagamento/          # snapshot — GET /pagamento/v1
├── estoque/                   # snapshot — GET /local-estoque/*
├── empresa/                   # snapshot singleton — GET /empresa/v1
├── contas-pendentes/          # snapshot com soft-delete — conta-receber/pagar/pendentes/v1
├── sync/                      # orquestra os módulos acima: cron, backfill, SyncLog, /sync/status
├── upstream/                  # MeuErpOnlineClient — fila/backoff/paginação do rate limit do ERP
├── redis/                     # RedisService (@Global) — cache-aside por geração, ver seção "Cache"
├── common/                    # exception filter, validation pipe, guard, DTOs genéricos, utils
├── config/                    # schema Joi de env
├── prisma/                    # PrismaService (@Global)
├── bootstrap.config.ts        # prefixo/pipes/filters/Swagger — compartilhado por main.ts e o e2e
└── main.ts
```

Cada domínio segue o mesmo formato: `dto/` (query + response, nunca a entidade Prisma crua),
`*.mapper.ts` (payload cru do ERP → shape interno, defensivo — nenhum campo confia no tipo que a
API promete), `*.service.ts` (`sincronizarDia`/`sincronizarSnapshot` + leitura), `*.controller.ts`,
`*.module.ts`.

## Contrato com o front

Endpoints sob `/api/v1`, pensados pra serem um substituto próximo do que o front já chama hoje
(mesmos parâmetros `inicio`/`fim` em `YYYY-MM-DD`) — a troca do front é majoritariamente de base
URL, não de lógica:

| Endpoint deste backend | Substitui (Meu ERP Online) |
|---|---|
| `GET /vendas` | `GET /documento/v1` |
| `GET /itens-vendidos` | `GET /documento/mercadorias-vendidas/v1` |
| `GET /comissoes` | `GET /funcionario/comissoes/v1` |
| `GET /produtos` | `GET /mercadoria/v1` |
| `GET /clientes` | `GET /pessoa/v1` |
| `GET /formas-pagamento` | `GET /pagamento/v1` |
| `GET /estoque/resumo` | `GET /local-estoque/*` |
| `GET /contas-a-receber`, `GET /contas-a-pagar` | `GET /conta-{receber,pagar}/pendentes/v1` |
| `GET /empresa` | `GET /empresa/v1` |
| `GET /sync/status` | novo — não existe no ERP |

**Front já integrado.** `frontend/src/services/api.ts`/`dataService.ts` chamam este backend, não
mais a Meu ERP Online direto — a fila de rate-limit/paginação do lado do navegador foi removida
(migrou pra cá) e a UI de "carregando página X de Y" só ficou onde ainda faz sentido
(`ClientesPage`/`ProdutosPage`, que ainda paginam de verdade — `VendasPage` não, `GET /vendas`
não é mais paginado do lado do client). Pendência ainda aberta: o front ainda não limita os
próprios filtros de período a 365 dias (ver item 2 de "Decisões que merecem revisão" abaixo) —
até lá, um filtro "Ano" ou um "Personalizado" antigo pedindo mais que a janela mantida recebe o
`422 FORA_DA_JANELA_DISPONIVEL` deste backend.

## Decisões que merecem revisão

Registradas aqui desde o primeiro commit (seção 1 do documento de padrões) — pragmáticas, não
definitivas:

1. **Auth deste backend = chave de API compartilhada simples** (`X-API-Key`), não JWT completo.
   Decidido explicitamente pelo dono do produto: este backend tem um único client conhecido (o
   front do PICOS Analytics), não é multi-tenant, e o front ainda não tem sessão de backend
   própria (login hoje é só Google Identity Services no navegador). Reavaliar pra JWT se este
   backend algum dia precisar diferenciar usuários/papéis.
2. **Período fora da janela de 365 dias = erro `422`, sem fallback ao vivo pro ERP.** Decidido
   explicitamente pelo dono do produto — e já fechado do lado do front: o preset "Ano" foi
   removido, "Semestre" passa por um limite único em `resolverIntervalo` (`frontend/src/utils/
   periodo.ts`, `JANELA_MAXIMA_DIAS`) que nunca deixa `inicio` passar de 365 dias atrás, e o
   calendário de "Personalizado" (`PeriodRangeCalendar.vue`) já desabilita no próprio componente
   qualquer dia fora da janela (`min-value`/`max-value` do `RangeCalendarRoot`), em vez de deixar
   escolher e só rejeitar depois. O `422 FORA_DA_JANELA_DISPONIVEL` deste backend continua como
   defesa em profundidade — nunca confiar cegamente no client — mas na prática não deveria mais
   disparar a partir do front atual.
3. **`isVendaValida` migrou pro backend** (`src/vendas/venda-valida.util.ts`) como a única fonte
   de verdade — `GET /vendas` já devolve só vendas válidas, e o front (`frontend/src/services/
   apiConstants.ts`) não reimplementa mais esse filtro.
4. **Documentos inválidos (`PP`/`SF`/`FC`/`AX`) são armazenados com fidelidade bruta**, não
   descartados na ingestão — `isVendaValida` filtra na leitura. Mantém a opção de usar esses
   dados no futuro (ex.: horário de abertura/fechamento de caixa) sem precisar re-sincronizar.
5. **Chave natural de `ComissaoDia` é `nomeFuncionario`** — o payload de
   `funcionario/comissoes/v1` mapeado hoje não expõe nenhum ID de funcionário. Isso tem risco
   real de colisão entre dois funcionários homônimos. Verificar o payload cru da API (pode ter
   um campo de ID não mapeado ainda) e migrar a chave antes de depender disso em produção com
   uma equipe grande.
6. **Sincronização de `contas-a-receber`/`contas-a-pagar` usa uma janela generosa arbitrária**
   (2 anos pra trás, 1 ano pra frente) ao consultar o ERP, porque não está confirmado se esses
   endpoints filtram por `dtLancamento` ou `dtVencimento`, nem se aceitam omitir
   `inicio`/`fim` pra devolver tudo (o front sempre chamou com um período). Ajustar
   `ANOS_PARA_TRAS`/`ANOS_PARA_FRENTE` em `contas-pendentes.service.ts` se a faixa real precisar
   ser maior — ou trocar pela resposta real da API assim que isso for validado contra o ambiente
   de produção.
7. **Estoque sincroniza junto do resto, 1x/dia.** Saldo de estoque muda o dia inteiro em
   qualquer PDV ativo — se "total em estoque" precisar refletir quase em tempo real, mover
   `EstoqueService` pra um `@Cron` próprio, mais frequente (ex.: de hora em hora), em vez de
   dentro do ciclo diário genérico.
8. **`Dre` (`GET /dre/v1`) não foi implementado nesta primeira versão** — nenhuma tela do front
   consome hoje (`getDre` existe em `dataService.ts` mas está sem uso). Revisitar se/quando
   alguma tela passar a precisar.
9. **`ContaPendente` liquidada é soft-delete** (`aindaPendente:false`, `liquidadaEm` preenchido),
   nunca apagada fisicamente — mantém histórico auditável do que foi conferido, ao custo da
   tabela só crescer. Se isso virar problema de volume, considerar arquivar linhas soft-deletadas
   há muito tempo em vez de mudar pra deleção física.
10. **Catálogo de produtos não marca como inativo o que sumiu da resposta do ERP** — só faz
    upsert do que veio. Se um SKU realmente descontinuado precisar sumir do front, isso precisa
    de um passo extra ("marcar tudo que não veio nesta sincronização como inativo").
11. **`js-yaml` (dependência transitiva de `@nestjs/swagger`, usada só pra gerar a doc OpenAPI
    em dev) tem um advisory de severidade alta** (`npm audit`) sem correção não-breaking
    disponível no momento deste commit. Risco real baixo (não processa YAML de entrada não
    confiável em nenhum fluxo desta aplicação), mas vale checar `npm audit` de novo depois de
    atualizar `@nestjs/swagger`.
12. **Hospedagem não definida.** O `docker-compose.yml`/`Dockerfile` seguem o padrão do
    documento (processo de longa duração + cron interno), o que não é um bom encaixe pra
    serverless (Vercel, onde o front está hospedado). Escolher separadamente onde este backend
    roda (Railway, Render, Fly.io, VPS) antes do primeiro deploy real.

## Verificação feita

- `prisma migrate deploy` aplica a migration sem erro, criando as 12 tabelas de domínio.
- 19 testes unitários (mockando Prisma/upstream/Redis) + **8 testes e2e via HTTP real** — guard,
  validação, filtro de exceção, regra de janela de 365 dias e Swagger, todos passando contra um
  Postgres real.
- `docker compose --profile app --profile db up --build` sobe Postgres + Redis + a API
  containerizada de ponta a ponta (migration aplicada automaticamente no start do container) —
  os três serviços saem `healthy` e a API responde em `/api/v1/health`.
- Integração real com o front: `GET /vendas`, `/produtos`, `/clientes`, `/formas-pagamento`,
  `/estoque/resumo` chamados de verdade pelo navegador (Visão Geral, Produtos, Clientes,
  Pagamentos), com o front rodando contra o backend em Docker — sem erro de CORS, sem 500.
  `redis-cli KEYS '*'` confirmou as chaves de cache (`venda:g0:...`, `estoque:g0:...`) sendo
  criadas por essas chamadas reais.

**Não verificado**: chamada real à API Meu ERP Online (precisa de `ERP_API_TOKEN` de produção —
o backfill/sync nunca rodou de verdade, só a infraestrutura em volta) e o job `@Cron` disparando
sozinho às 3h (precisa de um processo de longa duração rodando por dias — não testável numa
sessão). Validar os dois com um token real antes do primeiro deploy.
