# Picos-BI — atualização de 26/09/2026

## Publicação
- Frontend: https://picos-bi.vercel.app/visao-geral
- Deployment: https://picos-d47rvx5tl-leonardo-balbinos-projects.vercel.app
- API: https://picos-bi-api.162-35-175-137.sslip.io/api/v1
- Imagem: isv-picos-bi:20260926-intraday
- SHA ativo: sha256:0899c13fdb23c0f3c10c84582cec22c7bb18d442a4338e60e019b8ae4c1967cf
Escopo exclusivo do BI. Sem migrations, mudança de schema ou dependências.

## Arquitetura e atualização
O backend NestJS consulta o MeuERP em segundo plano e persiste no PostgreSQL picos_analytics da VPS. O navegador Vue/Vercel consulta somente o backend HTTPS autenticado por JWT. Não consulta o banco do computador nem diretamente a API do ERP. O token ERP permanece no servidor.
Redis acelera leituras; a geração de cache avança após sincronização. /vendas/resumo entrega KPIs e séries compactas, /vendas/pagina entrega detalhes paginados.
O frontend verifica /sync/atualizacao a cada 60 segundos enquanto a aba está visível e ao voltar para ela. Quando detecta nova sincronização de vendas concluída, limpa o cache e recarrega os dados dependentes. Atualizar recarrega a base do backend, sem disparar importação do ERP.

### Agendamentos
- Hoje: cron */10 * * * *, America/Sao_Paulo. Vendas, itens vendidos e comissões, sequencialmente por loja/entidade. Reconsulta hoje mesmo após sucesso anterior para captar novos movimentos.
- Reconciliação: 03:05, 03:15, 03:25, 03:35, 03:45, 03:55. Uma conclusão por dia por processo; reimporta ontem, recupera dias faltantes e atualiza snapshots/cadastros. Reinício do processo permite outra execução idempotente.
- Janelas existentes preservadas: vendas 365 dias; padrão 90 dias.
- Trava Redis exclusiva com proprietário aleatório, validade 180s e renovação a cada 30s; liberação condicionada ao dono. Outra sincronização em andamento adia o ciclo. Indisponibilidade Redis impede iniciar importações, mas leituras podem recorrer ao banco.
- Mantidas fila e retentativas do cliente ERP. Dez minutos é frequência de início, não garantia de conclusão; falhas, duração do ERP e jobs em andamento podem atrasar.
- A tela mostra o último sucesso de vendas e indica pendência, falha ou atraso. Não mostra um horário fictício apenas porque o usuário clicou Atualizar.

### Integridade
Upserts preservam identidade dos documentos e evitam duplicação. Falha de obtenção ERP não zera o resultado anterior. Após resposta completa e válida, os agregados de itens/comissões ausentes são zerados por loja/data na mesma transação dos novos valores, evitando conservar totais de movimentos cancelados/removidos do relatório.
A autorização por loja é aplicada no backend, incluindo filtros de itens/comissões. Respostas antigas não sobrescrevem filtros mais recentes; respostas após logout não repovoam cache.

## Interface entregue
Painel responsivo com destaque roxo, verde e laranja, faturamento, quantidade, ticket e CMV. CMV permanece explicitamente estimado em 35%; nenhum lucro real, margem ou pontuação de saúde foi inventado.
Rótulos pretos acima das barras verticais, também nos gráficos mistos/Pareto. Nas horizontais ficam no final da barra. Categorias numerosas têm rolagem própria para manter legibilidade; tooltips preservam detalhamento.
Horários vazios antes/depois da faixa de vendas são retirados; lacunas internas permanecem.
Mês atual e Mês anterior explícitos; mês anterior usa calendário completo. Participação aparece com loja única (100% quando há faturamento).
Seleção de lojas com opção Somente e limpeza de PDV incompatível ao mudar unidade. Produtos/comissões recebem as lojas selecionadas. Vendedor não é confundido com operador de caixa.
Modo TV reaproveita a atualização automática.

## Centro e backup
Auditoria identificou zero registros comerciais de Centro: vendas, itens, comissões, produtos, pessoas, formas de pagamento, locais de estoque, contas e logs. Sem token próprio ou empresa ERP; havia um vínculo de usuário.
A loja 0b336a48-2425-49e7-9306-730fadd5c609 (picos-centro) foi desativada por ativo=false, preservando cadastro e vínculos. Inhuma segue ativa. Reativar Centro somente após validar cadastro e credencial apropriada.
Antes da alteração:
- Dump: /var/backups/interserver/picos-bi/20260926-pre-dashboard/picos_analytics.dump
- pg_dump -Fc --no-owner --no-acl; 529555 bytes; diretório700/arquivo600.
- SHA256: 00e45266084d0e1617aef467d45d50f706e4464afbb2f81b5de7139cf1d03c64
- Metadados: centro-before.json no mesmo diretório, modo600.
- Ambiente anterior: /etc/interserver/picos-bi.env.pre-dashboard-20260926
Não publicar dump/segredos. É cópia pontual protegida por permissões, não substitui backup externo cifrado recorrente.

## Evidências
- Backend compilado e 51 testes aprovados: exclusão mútua Redis, repetição intradiária, fronteira de dia em São Paulo, falha ERP preservando dados, reconciliação de ontem, autorização e limpeza de agregados ausentes.
- Frontend: vue-tsc e build Vite aprovados localmente e Vercel. Quatro casos de datas: virada de ano, fevereiro bissexto, mês atual e personalizado.
- Login, painel público, mês atual/anterior, participação de loja única e layout desktop/celular verificados.
- Ciclo real às 13:10 BRT de 26/09: sucesso VENDA, ITEM_VENDIDO, COMISSAO; zero registros retornados para hoje. Isso descreve a resposta observada do ERP, não prova ausência de vendas em outras fontes.
- Setembro até 26/09/Inhuma: resumo e detalhes coincidiram em 823 vendas elegíveis e R$18.952,83; ticket R$23,03.
- /lojas autenticado 200 com Inhuma; sem credenciais 401.
- Tempos internos pontuais: resumo291ms, detalhes910ms, lojas9ms, status11ms; não equivalem ao tempo total do navegador.
- BI/Redis saudáveis após deploy; outros contêineres continuaram ativos e não foram recriados.
- Reconciliação noturna testada automaticamente; ainda não observada em produção nesta data. Conferir próxima janela.
O build ainda informa chunks grandes de bibliotecas; não houve atualização de dependências nesta entrega.

## Publicação futura
Compilar/testar PowerBi-Backend, gerar imagem com tag única, registrar SHA, mudar somente APP_IMAGE em /etc/interserver/picos-bi.env e executar:
    bash /opt/interserver/scripts/preflight.sh picos-bi
    bash /opt/interserver/scripts/compose.sh picos-bi up -d --no-deps --wait --wait-timeout 180 app
    bash /opt/interserver/scripts/compose.sh picos-bi ps
Neste deploy Docker local estava indisponível. O dist compilado foi enviado por SSH e a imagem montada na VPS sobre a imagem anterior validada, com as mesmas dependências, copiando dist para /app/dist como nestjs:nodejs. Para alterações de dependências, usar build completo pelo Dockerfile do projeto. Compose não executou migrations.
Frontend: na pasta frontend, npm run build e vercel deploy --prod --yes --scope leonardo-balbinos-projects. Manter projeto picos-bi, URL da API e JWT, sem chave pública de backend. Conferir alias e login.

## Rollback
Backend anterior: sha256:bb9fa692723a3756677ad8474557914bb44c9336b34270d2347dd360cfc6fc82.
Restaurar somente APP_IMAGE anterior e recriar apenas app. Não usar down -v.
Frontend anterior: https://picos-nzmt22mv7-leonardo-balbinos-projects.vercel.app; revisar configuração antes de promovê-lo.
Rollback de código não desfaz sincronizações. Não sobrepor vendas novas com dump antigo para reverter interface. Centro pode ser reativada pelo campo ativo após análise; nenhum vínculo foi excluído.
