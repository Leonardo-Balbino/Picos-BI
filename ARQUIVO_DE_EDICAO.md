# ARQUIVO DE EDIÇÃO — PICOS Analytics (Front-end)

> Documento de mapeamento do estado atual da aplicação. Objetivo: servir de base de referência rápida para edições em massa — qualquer alteração em larga escala (troca de paleta, refatoração de um tipo de gráfico, mudança de agregação, novo campo em mock, etc.) deve começar por aqui para saber **onde** cada coisa vive e **quem depende de quem**.
>
> Gerado a partir da leitura direta do código-fonte em `src/` (não do CLAUDE.md nem dos PNGs) — reflete o que **de fato está implementado** em 2026-07-17. Onde a implementação diverge do CLAUDE.md, isso é sinalizado explicitamente na seção 10.

---

## 1. Stack e versões instaladas

| Camada | Tecnologia | Versão (package.json) |
|---|---|---|
| Framework | Vue 3 (`<script setup>` + Composition API) | `^3.5.39` |
| Build | Vite | `^8.1.1` |
| Linguagem | TypeScript (strict, via `vue-tsc`) | `~6.0.2` |
| Estilo | Tailwind CSS v4 (via `@tailwindcss/postcss`, npm) | `^4.3.2` |
| Componentes headless | Reka UI | `^2.10.1` |
| Ícones | `bootstrap-icons` (classes `bi bi-*`) | `^1.13.1` |
| Roteamento | Vue Router | `^5.1.0` |
| Estado | Pinia | `^3.0.4` |
| Gráficos | ApexCharts + `vue3-apexcharts` | `^5.16.0` / `^1.11.1` |
| Fonte | `@fontsource/montserrat` (self-host) | `^5.2.8` |

Scripts: `npm run dev`, `npm run build` (`vue-tsc -b && vite build`), `npm run preview`.

Não há Vuetify/PrimeVue nem UI kit pronto — tudo é Tailwind sobre primitivos Reka UI, conforme exigido.

---

## 2. Estrutura de pastas real (`src/`)

```
src/
├── App.vue                      # root: <RouterView/>
├── main.ts                      # bootstrap Vue + Pinia + Router + vue3-apexcharts
├── style.css                    # import Tailwind + @fontsource/montserrat
├── components/
│   ├── layout/     AppShell.vue, AppSidebar.vue, AppTopbar.vue, PageHeader.vue
│   ├── filters/    GlobalFilters.vue, FilterControls.vue
│   ├── ui/         AppToast, BaseButton, BaseModal, BaseSelect, BaseSwitch,
│   │               BrandLogo, DataTable, EmptyState, KpiCard, Pagination,
│   │               RankingList, SkeletonCard, StatusBadge
│   └── charts/     ChartTheme.ts, LineAreaChart, BarChart, HBarChart,
│                    DonutChart, ComboChart, ParetoChart
├── composables/    useAggregations.ts, usePagination.ts
├── mocks/          vendas.json, produtos.json, clientes.json, vendedores.json,
│                   categorias.json, usuario.json
├── pages/          VisaoGeralPage, VendasPage, ProdutosPage, ClientesPage,
│                   VendedoresPage, PagamentosPage, RelatoriosPage,
│                   ConfiguracoesPage, LoginPage, DevUiPage
├── router/index.ts
├── services/       api.ts, dataService.ts
├── stores/         useAuthStore, useConfiguracoesStore, useFiltersStore,
│                   useUiStore, useVendasStore
├── types/index.ts
└── utils/          formatters.ts, statusMaps.ts
```

Não existe pasta `assets/` com logo separada (o logo é o componente SVG `BrandLogo.vue`, inline). Não existe `PeriodPicker.vue` isolado — o seletor de período está embutido em `FilterControls.vue`.

---

## 3. Design tokens (aplicados em `tailwind.config.js`)

```js
colors: {
  brand:   { 900:'#2E1F42', 700:'#452C63', 500:'#6D528C', 100:'#EDE8F4' },
  green:   { 500:'#3FBF8F', 400:'#62D26F', 100:'#E3F7EE', 700:'#1E8E5A' },
  danger:  { 500:'#E05260', 100:'#FCE9EB', 700:'#C23A47' },
  warning: { 500:'#F0A93B', 100:'#FDF3DF', 700:'#B47A12' },
  surface: { DEFAULT:'#FFFFFF', bg:'#F5F4F7', border:'#E2DFE8' },
  ink:     { DEFAULT:'#2E1F42', muted:'#6B6478' },
}
fontFamily: { sans: ['Montserrat','sans-serif'] }
borderRadius: { card:'14px', btn:'10px' }
```

Idêntico ao especificado no CLAUDE.md, sem tokens extras nem `surface-container-*`.

`CHART_PALETTE` (em `src/components/charts/ChartTheme.ts`) — ordem fixa usada por **todos** os gráficos:

```ts
['#452C63' /*roxo*/, '#3FBF8F' /*verde*/, '#F0A93B' /*âmbar*/,
 '#3B82A9' /*azul-petróleo*/, '#8B6DB0' /*lilás*/, '#8FD9A8' /*verde claro*/]
```

`CHART_COLORS` é o mesmo conjunto em forma de objeto nomeado (`roxo`, `verde`, `ambar`, `azulPetroleo`, `lilas`, `verdeClaro`, `danger`, `ink`, `inkMuted`, `border`) — usado quando um gráfico precisa referenciar uma cor específica em vez do array.

---

## 4. Camada de dados

### 4.1 `services/api.ts`
Função única `apiGet<T>(resource: string)`: `await import('../mocks/${resource}.json')` + `setTimeout(250ms)` + `structuredClone`. Ponto único de troca mock → API real.

### 4.2 `services/dataService.ts`
Wrappers tipados: `getVendas()`, `getProdutos()`, `getCategorias()`, `getVendedores()`, `getClientes()`, `getUsuarioConfig()`. Também define a interface `UsuarioConfig` (organização/metas/preferências) usada pela página Configurações.

### 4.3 Mocks — volume real e schema

| Arquivo | Registros | Observação |
|---|---|---|
| `vendas.json` | **1.115** transações | jan–jul/2026, campo `id` não sequencial (`t1`, `t3`...) |
| `produtos.json` | 15 | 6 categorias |
| `categorias.json` | 6 | `cat-eletronicos`, `cat-informatica`, `cat-acessorios`, `cat-audio-video`, `cat-papelaria`, `cat-games` |
| `vendedores.json` | 6 | 2 lojas (`Loja Matriz`, `Filial Sul`, ...) |
| `clientes.json` | 35 | ligeiramente abaixo dos "~40" do CLAUDE.md |
| `usuario.json` | objeto único | organização "Supermercado Silva" |

Volumes e sazonalidade batem com o pedido do CLAUDE.md (~800–1200 transações, jan–jul/2026).

**Campos extras não documentados no CLAUDE.md** (ver seção 10): `Cliente.ramo` e `Cliente.dataEntradaDia` existem no mock/tipo real e são usados na UI (segmentação por ramo em Top Clientes).

### 4.4 Tipos (`types/index.ts`) — schema real
```ts
type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito'
type StatusVenda = 'concluida' | 'cancelada' | 'estornada'
type Segmento = 'vip' | 'regular' | 'ocasional'
type PeriodoPreset = 'hoje' | '7d' | '30d' | 'mes' | 'trimestre' | 'ano' | 'personalizado'

interface Venda { id, numero, dataHora, vendedorId, clienteId: string|null,
  formaPagamento, status, itens: ItemVenda[], total }
interface ItemVenda { produtoId, categoriaId, quantidade, precoUnit, custoUnit }
interface Produto { id, sku, nome, categoriaId, preco, custo, estoque }
interface Cliente { id, nome, ramo, primeiraCompra, ultimaCompra }
interface Vendedor { id, nome, loja, avatar?, metaMensal }
interface Categoria { id, nome, icone }
interface FiltrosState { periodo, range:{inicio,fim}, lojaId, categoriaId,
  formaPagamento, vendedorId }
```

### 4.5 Stores (Pinia)

- **`useVendasStore`** — estado bruto (`vendas`, `produtos`, `categorias`, `vendedores`, `clientes`) + flags `carregando`/`carregado`. Getters: `lojas` (deduplicado de `vendedores.loja`), `produtoPorId`, `vendedorPorId`, `clientePorId`, `categoriaPorId`. Ação `carregar()` dispara os 5 `Promise.all` — chamada em `AppShell.vue` no mount.
- **`useFiltersStore`** — estado global dos filtros (`FiltrosState`), default `periodo:'30d'`. Ação `setRangePersonalizado`.
- **`useConfiguracoesStore`** — `dados: UsuarioConfig|null`, ações `carregar()`/`salvar(parcial)` (merge raso local, sem persistência real).
- **`useAuthStore`** — `usuario: {nome,email,contaGoogleVinculada}|null`, getter `autenticado`, ações `login()` (mocka usuário fixo "João Silva"), `logout()`, `desvincular()`.
- **`useUiStore`** — `toasts[]`, `sidebarMobileOpen`, `filtersSheetOpen`. Ação `toast()` (auto-dismiss 4s) usada por toda ação "disponível em breve".

---

## 5. `useAggregations()` — o motor de dados de todas as telas

Composable central em `src/composables/useAggregations.ts`. **Nenhum componente lê os JSONs de mock diretamente** — tudo passa por aqui. Ponto crítico: `HOJE` é fixado em `2026-07-11T23:59:59Z` (âncora do fim do dataset seed), não `new Date()` real — se o dataset for expandido, esta constante precisa mudar junto.

Filtros aplicados globalmente antes de qualquer agregação (`passaFiltrosBase` + `itensFiltrados`): vendedor, forma de pagamento, loja (via vendedor→loja) e categoria (filtra `itens[]` dentro da venda, não a venda inteira).

Funções expostas e quem as consome:

| Função | Retorno | Usada em |
|---|---|---|
| `kpisGerais` (computed) | faturamento/nVendas/ticketMédio/itens + variação % vs. período anterior | Visão Geral, Vendas, Vendedores |
| `metaDoMes` (computed) | `{faturamentoMes, meta, progresso}` — meta vem de `useConfiguracoesStore` | Visão Geral (KPI "Meta do Mês") |
| `serieTemporalFaturamento()` | `{categorias, valores}` por dia no intervalo | Visão Geral (linha), Vendas (combo) |
| `serieTemporalNumeroVendas()` | idem, contagem de vendas/dia | Vendas (combo, linha secundária) |
| `vendasPorDiaSemana()` | contagem Dom–Sáb + `highlightIndex` (dia de hoje) | Visão Geral (barras) |
| `vendasPorHora()` | array[24] | usado internamente por `destaquesPeriodo` |
| `porFormaPagamento()` | linhas por forma com valor/nTransações/ticket/% | Visão Geral (donut), Pagamentos (KPIs, donut, tabela) |
| `evolucaoDiariaPorFormaPagamento()` | séries empilhadas por forma/dia | Pagamentos (barras empilhadas) |
| `topProdutos(n, 'faturamento'\|'quantidade')` | ranking | Visão Geral, Produtos (toggle) |
| `topVendedores(n)` | ranking | Visão Geral |
| `topClientes(n)` | ranking por valor | Clientes (Top 5 Faturamento) |
| `vendasPorCategoria()` | valor + % por categoria | Visão Geral (ranking), Produtos (HBar) |
| `curvaABC()` | classes A/B/C + % acumulado | Produtos (Pareto) |
| `novosVsRecorrentes()` | por mês, novo = `primeiraCompra` cai no mês | Clientes (barras empilhadas) |
| `segmentacaoClientes()` | VIP (top 20%) / Regular (20–50%) / Ocasional (50–100%) por valor gasto | Clientes (cards) |
| `comparativoPeriodos()` | atual vs. anterior por dia da semana | Vendas (barras) |
| `destaquesPeriodo()` | maior venda / melhor dia / horário de pico | Vendas (card destaque) |
| `tabelaVendas` (computed) | linhas para DataTable | Vendas |
| `tabelaProdutos()` | linhas com margem % | Produtos |
| `alertaEstoque()` | produtos com giro>0 e `diasRestantes<7` | Produtos (alerta vermelho) |
| `tabelaVendedores()` | linhas com `statusMeta` (% do mês) e `tendencia` | Vendedores |
| `desempenhoEquipeMensal()` | série mensal independente do filtro de período | Vendedores (barras) |
| `tabelaClientes()` | linhas com nCompras/ticket/totalGasto | Clientes |
| `clientesAtivos`, `novosClientes`, `taxaRecompra` (computed) | KPIs derivados de `tabelaClientes()` | Clientes |

Regra de negócio a lembrar em edições: **classificação ABC** usa corte em 80%/95% do acumulado; **segmentação de clientes** usa corte por posição no ranking (20%/50%), não por valor absoluto.

---

## 6. Sistema de gráficos (`components/charts/`)

Todos são wrappers finos de `vue3-apexcharts`, cada um chamando `mergeChartOptions()` (de `ChartTheme.ts`) para herdar fonte Montserrat, `fill:{type:'solid'}`, cores da paleta, grid/legenda/tooltip padronizados. **Nenhum usa gradiente.**

| Componente | Tipo Apex | Props principais | Particularidade |
|---|---|---|---|
| `LineAreaChart.vue` | `area` | `categories, series, metaValue?, metaLabel?, valueFormatter?` | Linha de meta via `annotations.yaxis` tracejada lilás |
| `BarChart.vue` | `bar` (vertical) | `..., highlightIndex?, stacked?` | Se `highlightIndex` + série única → barras "distributed" (destaca 1 barra na cor roxa, resto cinza `#D8D3E0`) |
| `HBarChart.vue` | `bar` horizontal | `categories, series, valueFormatter?` | `dataLabels` sempre visíveis (valor dentro da barra) |
| `DonutChart.vue` | `donut` | `labels, series, valueFormatter?, totalLabel?` | Total no centro via `plotOptions.pie.donut.labels.total` |
| `ComboChart.vue` | `line` com séries mistas bar+line | `barName/barData, lineName/lineData` | `yaxis` array com `opposite:true` no eixo da linha |
| `ParetoChart.vue` | `line` com séries mistas column+line | `categorias, valores, classes, acumulado` | Cor de cada barra vem de `classColor[classe]` (roxo/lilás/cinza A/B/C); linha "% Acumulado" em âmbar, eixo secundário 0–100% |

Todos aceitam `height` numérico. Nenhum componente próprio de heatmap existe — o "horário de pico" na Visão Geral e Vendas usa `BarChart` (não um heatmap real).

---

## 7. Componentes de layout, filtros e UI

### Layout
- **`AppShell.vue`** — dispara `carregar()` de `useVendasStore` e `useConfiguracoesStore` no `<script setup>` (fetch global, uma vez). Monta `AppSidebar` + `AppTopbar` + `<RouterView/>` + `AppToast` (toasts sempre montados no shell).
- **`AppSidebar.vue`** — 8 itens fixos (Visão Geral → Configurações), ícones Bootstrap. Ativo = borda verde 3px esquerda + `bg-white/10`. Responsivo: `hidden md:flex w-16 xl:w-[260px]` (ícones only entre 768–1279px) + drawer mobile via `DialogRoot` do Reka UI controlado por `ui.sidebarMobileOpen`.
- **`AppTopbar.vue`** — busca (input estático, sem lógica de busca real), sino de notificação (badge vermelho fixo, sem contagem dinâmica), avatar com iniciais do usuário.
- **`PageHeader.vue`** — `title` + `subtitle?` opcional.

### Filtros
- **`GlobalFilters.vue`** — card wrapper; em telas `md+` renderiza `FilterControls` inline; em mobile vira botão "Filtros" que abre um `DialogRoot` bottom-sheet (`stacked` prop no `FilterControls`).
- **`FilterControls.vue`** — período via `ToggleGroupRoot` (Reka UI) + Popover de range personalizado (inputs `date`), 4 `BaseSelect` (loja/categoria/forma pagamento/vendedor, com opções derivadas de `useVendasStore`), botões Atualizar/Exportar (ambos só disparam toast "em breve" — Atualizar não recarrega dados de fato).

### UI base
- **`KpiCard.vue`** — modos: valor+variação (seta verde/vermelha), valor+suffix, ou barra de progresso (`progress` prop, usado só pela Meta do Mês). `highlight` pinta o card roxo sólido (`bg-brand-700`) — usado 1x na Visão Geral (Faturamento).
- **`DataTable.vue`** — genérico (`<script generic="T">`), slots nomeados `#cell-{key}` por coluna, ordenação via evento `sort` (lógica de sort fica na página, não no componente), `EmptyState` embutido quando `rows.length===0`.
- **`RankingList.vue`** — item com rank/avatar/título/subtítulo/valor/meta/barra de progresso opcional.
- **`Pagination.vue`** — wrapper do `PaginationRoot` do Reka UI.
- **`BaseButton.vue`** — 3 variantes (`primary` gradiente verde, `secondary` outline, `danger-ghost`), 2 tamanhos.
- **`BaseSelect.vue`** / **`BaseSwitch.vue`** — wrappers Reka UI (`SelectRoot`, `SwitchRoot`).
- **`BaseModal.vue`** — wrapper `DialogRoot` genérico com slots `default`/`footer` (usado só na `DevUiPage`, nenhuma página de produto o invoca hoje).
- **`StatusBadge.vue`** — 5 variantes de cor (`success/danger/warning/info/neutral`).
- **`EmptyState.vue`**, **`SkeletonCard.vue`** (variantes `kpi`/`chart`/`list`/`table-row`), **`AppToast.vue`** (Reka `ToastProvider`, auto-dismiss 4s), **`BrandLogo.vue`** (SVG losangos, variantes `light`/`color`).

---

## 8. Roteamento (`router/index.ts`)

```
/login          → LoginPage        (público)
/dev/ui         → DevUiPage        (público, fora do fluxo de produto)
/               → AppShell (layout)
  ''            → redirect /visao-geral
  visao-geral, vendas, produtos, clientes, vendedores,
  pagamentos, relatorios, configuracoes
* (catch-all)   → redirect /visao-geral
```

Guard `beforeEach`: rotas sem `meta.public` exigem `auth.autenticado`; usuário autenticado é redirecionado de `/login` para `/visao-geral`. **Autenticação é 100% mock em memória** — recarregar a página derruba a sessão (não há persistência em `localStorage`).

---

## 9. Páginas — mapeamento widget-a-widget

Para cada página: KPIs, gráficos (componente usado + função de agregação que o alimenta), tabelas, e detalhes de interação (busca, ordenação, paginação, abas).

### 9.1 `VisaoGeralPage.vue`
- **Skeleton**: 5 `SkeletonCard variant="kpi"` enquanto `!vendasStore.carregado`.
- **KPIs (5, grid `md:2 xl:5`)**: Faturamento (`highlight`, roxo sólido) · Nº de Vendas · Ticket Médio · Itens Vendidos (sem variação, só suffix) · Meta do Mês (`progress`, sem valor textual).
- **Gráficos**:
  - `LineAreaChart` "Faturamento ao longo do tempo" ← `serieTemporalFaturamento()`, com linha de meta (`agg.metaDoMes.value.meta`), `md:col-span-2`.
  - `BarChart` "Vendas por dia da semana" ← `vendasPorDiaSemana()`, `highlightIndex` = hoje.
  - `DonutChart` "Por Forma de Pagamento" ← `porFormaPagamento()`.
- **Rankings (3 colunas)**: Top 5 Produtos (`topProdutos(5,'faturamento')`), Top 5 Vendedores (`topVendedores(5)`, com avatar+iniciais+loja), Vendas por Categoria (`vendasPorCategoria()`, barra de progresso colorida por `CHART_PALETTE[i]`). Cada um com `EmptyState` se vazio.

### 9.2 `VendasPage.vue`
- **KPIs (4)**: Faturamento, Nº de Vendas, Ticket Médio, Nº de Itens — todos com variação %.
- **Gráficos**:
  - `ComboChart` "Faturamento vs. Volume" (barra=faturamento, linha=nº vendas, eixo secundário) ← `serieTemporalFaturamento()` + `serieTemporalNumeroVendas()`, `md:col-span-2`.
  - `BarChart` "Comparativo de Períodos" (Atual vs. Anterior por dia da semana) ← `comparativoPeriodos()`.
  - Card roxo sólido "Destaques do Período" (não é gráfico): Maior Venda, Melhor Dia, Horário de Pico ← `destaquesPeriodo()`.
- **Tabela "Analítico de Vendas"**: busca por cupom/vendedor, ordenação client-side (data/hora, vendedor, total), paginação 8/página. Colunas: Data/Hora, Cupom, Vendedor (avatar+iniciais), Itens, Pagamento, Valor Total, Status (`StatusBadge`).

### 9.3 `ProdutosPage.vue`
- **KPIs (4)**: Produtos Ativos (contagem do catálogo), Itens Vendidos, Produto Campeão (nome + valor + % do total), Margem Média.
- **Gráficos**:
  - `ParetoChart` "Curva ABC de Produtos" ← `curvaABC()`, com legenda manual de classes A/B/C + linha % acumulado, `md:col-span-2`.
  - `HBarChart` "Faturamento por Categoria" ← `vendasPorCategoria()`.
- **Ranking com abas** (`TabsRoot` Reka UI, "Faturamento"/"Quantidade") ← `topProdutos(5, abaRanking)`.
- **Alerta de Estoque** (card com borda vermelha) ← `alertaEstoque()`: produtos com giro/dia > 0 e `diasRestantes < 7`, ordenado por criticidade.
- **Tabela "Detalhamento de Produtos"**: busca por SKU/nome, ordenação (nome/qtd/faturamento/margem), paginação 8/página. Colunas: SKU, Nome, Categoria, Qtd. Vendida, Faturamento, Ticket Médio, Margem %.

### 9.4 `ClientesPage.vue`
- **KPIs (4)**: Clientes Ativos, Novos Clientes, Ticket Médio, Taxa de Recompra.
- **Gráficos**: `BarChart` empilhado "Novos vs. Recorrentes" (por mês) ← `novosVsRecorrentes()`.
- **Segmentação** (cards coloridos, não gráfico): VIP (roxo sólido) / Regular (verde sólido) / Ocasional (cinza) ← `segmentacaoClientes()`.
- **Tabela "Lista de Clientes"**: busca por nome (sem ordenação por coluna), paginação 8/página. Colunas: Cliente (avatar), Última Compra, Nº Compras, Ticket Médio, Total Gasto.
- **Top 5 Faturamento** ← `topClientes(5)` (RankingList, sem barra de progresso).

### 9.5 `VendedoresPage.vue`
- **KPIs (3) + card "Melhor Vendedor"** (não é KpiCard, card custom com avatar): Vendedores Ativos, Faturamento Total, Ticket Médio.
- **Top 5 Vendedores** (RankingList com `progress`=statusMeta, `meta`="X% da meta").
- **Gráfico**: `BarChart` "Desempenho da Equipe" (Atual vs. Anterior por mês, independente do filtro de período) ← `desempenhoEquipeMensal()`.
- **Tabela "Detalhamento por Vendedor"**: busca por nome, sem sort de coluna nem paginação (lista completa). Colunas: Vendedor, Faturamento (+ seta de tendência), Nº Vendas, Ticket Médio, Status Meta (barra colorida por faixa: verde ≥90%, roxo ≥70%, âmbar abaixo).

### 9.6 `PagamentosPage.vue`
- **4 cards por forma de pagamento** (crédito/PIX/débito/dinheiro) com ícone, % do total e valor compacto — não usam `KpiCard.vue`, são markup custom.
- **Gráficos**: `DonutChart` "Distribuição" ← `porFormaPagamento()`; `BarChart` empilhado "Evolução Diária" ← `evolucaoDiariaPorFormaPagamento()`.
- **Card roxo "Taxas de Cartão"**: custo estimado de adquirente — **taxas hardcoded no componente** (`TAXA_ESTIMADA`: crédito 2.5%, débito 1.4%, PIX/dinheiro 0%), não vem de mock nem de config.
- **Tabela "Detalhamento por Forma"** (sem busca/paginação — 4 linhas fixas) + linha de Total.

### 9.7 `RelatoriosPage.vue`
- **Sem `GlobalFilters`** (única página de produto sem a barra de filtros — os "últimos 7 dias" são calculados com data fixa `2026-07-11` independente do filtro global).
- Catálogo de 4 relatórios (cards à esquerda), só **"Vendas por Período" tem pré-visualização real** (gráfico `BarChart` + tabela últimos 7 dias vs. meta diária = meta mensal/30); os outros 3 mostram `EmptyState` "Relatório em desenvolvimento".
- Exportar PDF/Excel → sempre toast "disponível em breve" (`useUiStore().toast`).

### 9.8 `ConfiguracoesPage.vue`
- Sem `GlobalFilters`. 4 seções em cards: Perfil (avatar+nome+email+badge de vínculo Google+botão "Desvincular" ghost vermelho), Organização (nome/CNPJ + botão "Alterar Logo" que só dá toast), Metas (faturamento mensal global + meta média por vendedor, inputs numéricos), Preferências (período padrão/moeda/fuso via `BaseSelect` + 2 `BaseSwitch`).
- Barra fixa inferior (`fixed bottom-0`) com Cancelar (`resetForm`, reverte para `config.dados`) / Salvar (`config.salvar()` + toast sucesso). **Não navega nem persiste no backend** — é só estado da store em memória.

### 9.9 `LoginPage.vue`
- Split-screen: painel esquerdo roxo (`from-brand-900 to-brand-700`) com padrão SVG de losangos inline (`opacity:0.15`) + `BrandLogo variant="color"`; painel direito com botão "Entrar com Google" (SVG oficial de 4 cores) que chama `auth.login()` (usuário mock fixo "João Silva") e navega para `/visao-geral`. Sem formulário de e-mail/senha.

### 9.10 `DevUiPage.vue`
- Rota `/dev/ui`, pública, fora do fluxo de produto — catálogo vivo de todos os componentes de UI e um exemplo de cada tipo de gráfico com dados estáticos (não usa `useAggregations`). Serve de referência visual/QA do design system, não é uma tela do produto.

---

## 10. Divergências / notas em relação ao CLAUDE.md (para não ficarem escondidas em edições)

1. **`Cliente`** no schema real tem `ramo` e `dataEntradaDia` (mock), campos não previstos no CLAUDE.md original. `ramo` é usado ativamente (Top Clientes, tabela de clientes).
2. **`Vendedor`** tem `loja` (não estava no types original do CLAUDE.md) — é a base do filtro global "Loja" (`useVendasStore.lojas` deduplica a partir daqui).
3. Estrutura de pastas real usa `components/filters/FilterControls.vue` em vez de um `PeriodPicker.vue` isolado — o seletor de período é uma seção dentro de `FilterControls`, não um componente próprio.
4. `vue-router` está fixado em `^5.1.0` no `package.json` (major mais recente compatível com Vue 3 nesta instalação) — se algum tooling externo assumir v4, checar breaking changes antes de mexer no router.
5. **Botão "Atualizar"** dos filtros globais não recarrega dados de fato — só dispara toast de sucesso (`FilterControls.vue:handleAtualizar`). Os dados já são reativos a mudanças de filtro via `computed`; o botão é cosmético.
6. **Taxas de cartão em Pagamentos são hardcoded** no componente da página (`TAXA_ESTIMADA`), não vêm de `usuario.json` nem de nenhuma store — se o negócio pedir taxas configuráveis, é aqui que entra.
7. **`RelatoriosPage` e `ConfiguracoesPage` não renderizam `GlobalFilters`** — são as duas exceções às 8 páginas do produto.
8. `BaseModal.vue` existe no design system mas **nenhuma página de produto o utiliza hoje** (só aparece na `DevUiPage`) — candidato natural se alguma feature futura precisar de modal (ex.: detalhe de venda, confirmação de exclusão).
9. A âncora de "hoje" (`HOJE` em `useAggregations.ts`) é uma constante fixa (`2026-07-11`), não `Date.now()` — qualquer expansão do dataset de vendas para além de jul/2026 exige atualizar essa constante junto, senão os presets de período (`hoje`, `7d`, `mes`...) ficam desalinhados com os dados novos.

---

## 11. Onde mexer para tarefas comuns (atalhos para edição em massa)

- **Trocar uma cor de marca / paleta de gráfico** → `tailwind.config.js` (tokens Tailwind) e/ou `src/components/charts/ChartTheme.ts` (`CHART_PALETTE`, `CHART_COLORS`) — são os dois únicos lugares-fonte, nenhuma página usa hex direto para gráficos.
- **Adicionar um novo KPI/gráfico a uma página** → 1) criar/estender uma função em `useAggregations.ts`, 2) consumi-la via `computed()` na página, 3) plugar no wrapper de chart apropriado (seção 6).
- **Mudar regra de negócio de agregação** (ex.: corte da curva ABC, faixas da segmentação de clientes, dias para alerta de estoque) → tudo centralizado em `useAggregations.ts`, nada duplicado nas páginas.
- **Adicionar um novo filtro global** → `types/index.ts` (`FiltrosState`), `useFiltersStore.ts` (estado), `FilterControls.vue` (UI), e o predicado `passaFiltrosBase`/`itensFiltrados` em `useAggregations.ts` (para o filtro efetivamente filtrar).
- **Adicionar uma página nova** → `src/pages/`, registrar em `router/index.ts` (dentro do array `children` do `AppShell`), adicionar item em `AppSidebar.vue` (`navItems`, existe em duas cópias: desktop e drawer mobile).
- **Trocar mock por API real** → só `services/api.ts` precisa mudar (`apiGet`); `dataService.ts`, stores, composables e páginas não são tocados.
- **Formatação pt-BR (moeda/data/%)** → sempre via `utils/formatters.ts`; nunca montar "R$" ou datas na mão nas páginas.
