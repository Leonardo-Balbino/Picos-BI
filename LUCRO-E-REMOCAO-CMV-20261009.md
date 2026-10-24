# Lucro e remoção do CMV estimado — 09/10/2026

## Solicitação e implementação publicada

Removido o cartão CMV estimado da Visão Geral, sua linha na exportação e a nota sobre estimativa de 35%. Os três indicadores existentes (faturamento, quantidade de vendas e ticket médio) ocupam a linha responsiva. Não foi adicionado valor de lucro estimado.

Arquivo alterado: frontend/src/pages/VisaoGeralPage.vue.

O posicionamento previsto para lucro é junto dos indicadores principais, mostrando lucro bruto, custo total e margem no período selecionado. Essa inclusão permanece pendente de uma fonte confirmada de custo real.

## Diagnóstico da origem dos custos

Inspeção somente leitura de respostas reais da Poliana: documento/v1 (36 documentos do dia, incluindo itens), mercadoria/v1 (21 produtos) e documento/mercadorias-vendidas/v1 com Modelo PA. Nenhuma dessas respostas trouxe campos de custo, lucro ou margem. Isso não prova ausência em toda a API.

A documentação oficial em https://api.meuerponline.com.br/publica/swagger/index.html exige CNPJ/CPF, usuário e senha próprios. Foi solicitado ao usuário acesso à documentação ou a rota que fornece o custo usado no painel de lucro do ERP. Nenhuma tentativa de contornar autenticação foi feita.

O cálculo interno legado de custo estimado no backend não foi alterado nesta publicação; apenas deixou de ser apresentado nesta tela e exportação. Não houve mudança de banco, sincronização ou backend.

## Validação

Build Vercel aprovado (vue-tsc e Vite). Publicação: 9KdbzpJxbFQdTETaxQomk8RpSWkH. URL de release: https://picos-9kkznq3c9-leonardo-balbinos-projects.vercel.app.

Conferência autenticada em https://bi.picoserp.app/visao-geral confirmou três indicadores e ausência de CMV estimado. Captura: bi-sem-cmv-20261009.png, na pasta de visualizações desta conversa. Valores reais exibidos no dia: faturamento R$ 1.490,01, 18 vendas e ticket R$ 82,78.


## Atualização posterior no mesmo dia

O bloqueio de custo real foi resolvido: os custos estavam em mercadoriasLista[].documentoMercadoriaCustoLista, fora do objeto de item examinado inicialmente. A nova implementação remove a estimativa no resumo e publica lucro bruto/custos reais. Detalhes e validação em LUCRO-REAL-20261009.md. A descrição anterior registra o diagnóstico daquela publicação e foi superada por esta descoberta.
