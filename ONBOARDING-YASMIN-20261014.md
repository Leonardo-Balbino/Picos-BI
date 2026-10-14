# Inclusão de YASMIN ATACADO no BI

Data: 14/10/2026. Ambiente: produção.

## Resultado

Empresa configurada e liberada no PICOS Analytics com isolamento total multi-tenant: **YASMIN ATACADO**.

Foi criada uma organização independente, uma loja e usuários com perfil `FRANQUEADO` associados exclusivamente a essa loja. O acesso utiliza o frontend em produção: [bi.picoserp.app](https://bi.picoserp.app) (e [picos-bi.vercel.app](https://picos-bi.vercel.app)).

| Registro | Identificador |
|---|---|
| Organização | `a9b40f82-3d84-469b-90e9-b5bf3c6e4215` |
| Loja | `c8e54736-419b-4682-8bc1-6cb9d24a0d92` |
| Código da loja | `yasmin` |
| E-mail de login | `yasminatacado@picoserp.com.br` |
| E-mail alternativo | `yasmin@picosbi.local` |
| Perfil | `FRANQUEADO` (restrito unicamente a YASMIN ATACADO) |
| Senha de acesso | `Yasmin@2026` |


---

## Status da Chave API no Meu ERP Online e Sincronização Concluída

A chave API fornecida pelo usuário (`Yy9sWDhu...`) foi liberada no Meu ERP Online e respondeu `HTTP 200` com os dados oficiais:

- **Razão Social:** YASMIN ATACADO
- **Nome Fantasia:** YASMIN ATACADO
- **CNPJ/CPF:** `03680340389`
- **Município / UF:** PAULISTANA / PI
- **E-mail:** `yasminatacado@picoserp.com.br`
- **CRT:** MEI (Microempreendedor Individual)
- **Status:** Ativo

A sincronização inicial de todas as entidades e da janela recente foi executada com **100% de sucesso (todas as 28 tarefas aprovadas)**:

| Conjunto | Registros Importados |
|---|---:|
| Produtos cadastrados no ERP | 15 |
| Clientes / Fornecedores | 1 |
| Formas de pagamento | 5 |
| Saldos de estoque | 12 |
| Empresa | 1 |
| Documentos de movimentação armazenados | 25 |
| Contas a receber / pagar pendentes | 0 |

O ciclo de atualização automática de 10 minutos agora opera com `status: SUCESSO` em todas as unidades (`Açaí Senses - Inhuma`, `Água de Coco e Gelo Poliana` e `YASMIN ATACADO`).


---

## Isolamento e Segurança

1. **Separação no banco de dados**:
   - Organização própria (`a9b40f82-3d84-469b-90e9-b5bf3c6e4215`).
   - Loja própria (`c8e54736-419b-4682-8bc1-6cb9d24a0d92`).
   - Empresa própria (`empresa_c8e54736-419b-4682-8bc1-6cb9d24a0d92`).
   - Usuário franqueado vinculado exclusivamente a essa loja na tabela `UsuarioLoja`.

2. **Testes de autorização validados**:
   - `POST /api/v1/auth/login`: login autenticado com JWT restrito ao perfil `FRANQUEADO` e somente com o ID de YASMIN ATACADO em `lojasAutorizadas`.
   - `GET /api/v1/lojas`: retorna exclusivamente a loja YASMIN ATACADO.
   - `GET /api/v1/empresa`: retorna os dados de YASMIN ATACADO.
   - Tentativa de consulta a outras lojas (`idLoja=loja-inhuma` ou `idLoja=ca1a1a30-3666-4c0f-9b68-888675b91494`): retornou `HTTP 403 Forbidden`.
   - Tentativa de consulta a rotas de gestão de franqueados (`/lojas/franqueados`): retornou `HTTP 403 Forbidden`.
   - `GET /api/v1/vendas/resumo`: retornou `HTTP 200` com isolamento completo e total de vendas zerado (aguardando ativação no ERP).
   - Inhuma e Poliana continuaram sincronizando e operando com `status: SUCESSO` sem qualquer interferência.

---

## Backup e Scripts na VPS

- **Backup pré-operação**: `/var/backups/interserver/manual/picos-bi-yasmin-20261014T201344Z/picos_analytics.dump`
  - Permissões `0700` no diretório e `0600` no dump.
  - Catálogo validado via `pg_restore --list`.
- **Scripts de liberação e sincronização na VPS**:
  - `/opt/interserver/releases/picos-bi-yasmin-20261014/onboard.sql`
  - `/opt/interserver/releases/picos-bi-yasmin-20261014/initial-sync.cjs`
  - `/opt/interserver/releases/picos-bi-yasmin-20261014/run-sync.sh` (executável para teste de sincronização sob demanda)
