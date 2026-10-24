# PICOS Analytics

Monorepo do BI de vendas da PICOS Sistemas: front-end e backend em pastas separadas,
cada um com seu próprio ciclo de build/deploy.

```
Picos-BI/
├── frontend/   # Vue 3 + Vite — dashboard consumido pelo usuário final (ver frontend/README.md)
└── backend/    # NestJS + Prisma — sincroniza com a API Meu ERP Online e serve os dados
                # ao frontend (ver backend/README.md)
```

- **frontend/** — hoje consome a API pública Meu ERP Online diretamente do navegador. Ainda
  aponta pro ERP direto — falta repontar `services/api.ts`/`dataService.ts` pro `backend/` (ver
  "Contrato com o front" em `backend/README.md`) e limitar os filtros de período a 90 dias, pra
  bater com a janela que o backend mantém.
- **backend/** — implementado. Sincroniza uma janela rolante de 90 dias de dados do Meu ERP
  Online para Postgres e expõe uma API própria rápida (`/api/v1`), em vez de o navegador bater
  direto (e lentamente, por causa do rate limit) na API do ERP. Ver `backend/README.md` para
  como rodar, o contrato de endpoints, e as decisões registradas como pendentes de revisão.

Cada subprojeto tem seu próprio `package.json`, `node_modules` e scripts — não há
workspace único (`npm workspaces`/`turborepo`) configurado ainda. Rode os comandos de
dentro de cada pasta (`cd frontend && npm run dev`, `cd backend && npm run start:dev`).
