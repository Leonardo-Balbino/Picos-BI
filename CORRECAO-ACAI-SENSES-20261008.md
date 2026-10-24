# Açaí Senses: empresa independente e acesso próprio — 08/10/2026

## Resultado em produção

Açaí Senses e Água de Coco e Gelo Poliana são empresas independentes. A tabela Organizacao já tinha registros separados; a expressão “Organização Matriz” era um rótulo fixo na interface. O cadastro org-acai-senses foi renomeado de “Rede Açaí Senses” para “ACAI SENSES”, mantendo CNPJ, IDs, dados, sincronização e vínculos anteriores.

Foi criado o usuário acaisenses@picosbi.local, nome ACAI SENSES, vinculado exclusivamente à unidade ativa loja-inhuma. A senha foi entregue diretamente ao responsável e não está registrada neste documento. O usuário existente de Fernando, vinculado à unidade inativa Picos Centro, foi preservado.

O perfil interno FRANQUEADO permanece por compatibilidade com a autorização existente; na interface ele aparece como “Acesso da empresa”. Esse perfil não permite gerenciar usuários ou visualizar os dados de outras empresas. ADMIN representa o administrador do BI, independente dos clientes; os administradores existentes foram preservados.

## Interface

- Removidos os rótulos de matriz, rede de franquias e franqueado das telas operacionais afetadas.
- Administração apresenta “Empresas e unidades cadastradas” e “Usuários e permissões de acesso”.
- Cabeçalho global mostra “Picos BI — empresas independentes”, ou a unidade selecionada quando o filtro contém apenas uma unidade.
- Dados de identificação da empresa ficam disponíveis para o acesso do cliente; a administração apresenta a listagem de unidades em vez de atribuir o cadastro da Açaí a todas as empresas.
- Removidos os dados da Açaí usados como valores fictícios quando o cadastro não carregava.
- Identificação da empresa recarregada ao abrir uma nova sessão, evitando reaproveitar esse cadastro ao trocar de usuário.

## Publicação e verificações

Frontend publicado no projeto Vercel picos-bi, implantação DjUK4rVYo6jYbZrG6ZCeF2ipBjxX:
https://picos-n42kuli8d-leonardo-balbinos-projects.vercel.app

Os três endereços servem os mesmos arquivos de produção:
- https://picoserp.app
- https://www.picoserp.app
- https://picos-bi.vercel.app

Build local com verificação de tipos e build na Vercel concluídos. Validados por HTTP autenticado os logins, lojas, identificação, indicadores e isolamento cruzado de Açaí e Poliana. A consulta direta ao cadastro ou às vendas da outra empresa retorna 403; os endpoints de resumo e paginação com seleção externa retornam resultado vazio, pois filtram previamente as vendas autorizadas. Administração global de usuários retorna 403 para ambos os clientes. O administrador global continua consultando as duas empresas.

Verificação dos arquivos JS publicados confirmou os novos textos nos três domínios. Não foi realizada inspeção visual automatizada do navegador nesta etapa.

Não houve alteração no esquema do banco, em dados comerciais ou no algoritmo de sincronização. O cadastro e o novo usuário foram aplicados diretamente em transação no backend de produção; não foi necessário trocar a imagem do backend.

## Evidências e recuperação

Snapshot dos campos não sensíveis do cadastro e da ausência do novo usuário:
/var/backups/interserver/manual/picos-bi-acai-20261008/cadastro-before.json

Evidências locais:
- tmp/picos-bi-acai-20261008/cadastro-before.json
- tmp/picos-bi-acai-20261008/cadastro-after.json
- tmp/picos-bi-acai-20261008/verificacao-acessos.json
- tmp/picos-bi-acai-20261008/verificacao-deploy.json
- tmp/picos-bi-acai-20261008/source-before/

Para reverter, desativar especificamente o novo usuário ec1598d2-b68b-4f56-9b4f-df484e342ad4, restaurar somente o nome anterior de org-acai-senses conforme snapshot e promover a implantação anterior da Vercel GjYQgz5UR2wRHSS8WyH62hhf4VS2 se necessário. Não restaurar o banco inteiro nem excluir vendas.

Ao cadastrar novos clientes independentes, criar uma Organizacao própria e fornecer seu idOrganizacao ao cadastro da unidade. O fallback legado do endpoint de criação de unidade ainda associa cadastros sem organização à primeira organização; esse fluxo não foi modificado nesta correção.
