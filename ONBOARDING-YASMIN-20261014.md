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
| Usuário principal | `b7381290-7162-4215-9988-5e43a6f19011` (`yasmin@picosbi.local`) |
| Usuário alternativo | `d6290184-8273-4326-a099-6f54b702a122` (`yasminatacado@picosbi.local`) |
| Perfil | `FRANQUEADO` (restrito unicamente a YASMIN ATACADO) |
| Senha de acesso | `Yasmin@2026` |

---

## Status da Chave API no Meu ERP Online

A chave API fornecida pelo usuário (`Yy9sWDhu...`) foi testada diretamente contra a API Pública do Meu ERP Online (`https://api.meuerponline.com.br/publica/api/empresa/v1`):

- **Resposta da API upstream**: `HTTP 401` com o corpo `"API Inativa."`.
- **Diagnóstico**: Quando uma chave é inválida/inexistente, o Meu ERP Online retorna `"Código de integração inválido."`. Portanto, a chave fornecida é **autêntica e reconhecida pelo ERP**, porém o recurso de integração via API Pública está atualmente marcado como **Inativo** dentro do painel do Meu ERP Online da empresa YASMIN ATACADO (ou aguardando liberação no plano/módulo da empresa).
- **Comportamento automático**: A loja já foi cadastrada como ativa com seu token no backend. A rotina automática do backend (ciclo intradiário a cada 10 minutos e reconciliação diária às 03:00) já inclui a loja nas tentativas. Assim que a opção de API Pública for ativada no painel do Meu ERP Online, a próxima sincronização importará vendas, produtos, clientes, estoque e contas automaticamente.

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
