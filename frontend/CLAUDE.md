# PICOS Analytics — Front-end (BI de Vendas)

## 1. O QUE ESTAMOS CONSTRUINDO

Front-end de uma plataforma de Business Intelligence de vendas chamada **PICOS Analytics**, produto da PICOS Sistemas (Automação Comercial). É uma ferramenta analítica visual: dashboards de KPIs e gráficos que leem dados de vendas de PDV para o gestor de um comércio acompanhar desempenho.

Nesta fase construímos **APENAS o front-end**, com dados mockados em JSON. O backend (Python/Flask + login Google) virá depois — por isso a camada de dados fica abstraída em `services/`, para que trocar mock → API real seja trivial e não toque nos componentes ou nos gráficos.

- Single-org (sem multi-tenant), pt-BR, moeda R$
- Desktop-first, 100% responsivo (tablet e mobile)
- É um BI: o coração do produto são os gráficos e KPIs. Capriche na camada de visualização de dados.

## 2. STACK OBRIGATÓRIA

| Camada | Tecnologia |
|---|---|
| Framework | Vue 3 (Composition API + `<script setup>`) |
| Build | Vite |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS (via npm/PostCSS — NUNCA via CDN) |
| Componentes headless | Reka UI (https://reka-ui.com/) — Dialog, Select, Popover, Switch, Tabs, Toast, DropdownMenu, RadioGroup, ToggleGroup |
| Ícones | Bootstrap Icons (pacote `bootstrap-icons`) — substituir quaisquer Material Symbols do export |
| Roteamento | Vue Router |
| Estado | Pinia |
| **Gráficos** | **ApexCharts via `vue3-apexcharts`** — linha/área, barras, barras horizontais, donut, combinados (barra+linha com eixo Y secundário), Pareto/ABC. Centralizar tema (cores, fontes, grid) num único arquivo de config (`ChartTheme.ts`, opções base do ApexCharts reutilizadas por todos os wrappers) |
| Fontes | Montserrat (self-host via `@fontsource/montserrat`) |

Não usar UI kits prontos (Vuetify, PrimeVue etc.). Os componentes visuais são construídos com Tailwind sobre os primitivos headless do Reka UI.

**Observações específicas do ApexCharts (para cumprir a seção 5):**
- Séries e fatias sempre com `fill: { type: 'solid' }` — nunca gradiente (`type: 'gradient'`) mesmo em area charts.
- `colors` de cada gráfico vem sempre de `CHART_PALETTE` (nunca cor default do ApexCharts).
- Donuts: usar `plotOptions.pie.donut.labels.total.show = true` com `formatter` chamando `formatCurrency`/`formatCompact` para exibir o total no centro.
- Combos (barra+linha): `chart.type: 'line'` no wrapper com series mistas (`type: 'bar'` / `type: 'line'`) e `yaxis` em array com `opposite: true` no eixo secundário.
- Pareto/ABC: mixed bar (faturamento por classe) + line (% acumulado) no eixo secundário, 0–100%.
- Tooltip, legendas e eixos usando `fontFamily: 'Montserrat'` e os tokens de cor da seção 4 (nunca a paleta default do ApexCharts).

## 3. COMO USAR O EXPORT DO STITCH (pasta `design-reference/`)

O export está em `design-reference/`. Nesta rodada o Stitch manteve a identidade visual corretamente — os `screen.png` são a referência fiel a reproduzir.

**APROVEITAR**
- `screen.png` de cada tela → referência visual oficial. Ao construir uma página, abra o PNG e reproduza fielmente layout, hierarquia, composição de widgets, espaçamentos e tipos de gráfico.
- Estrutura de layout dos `code.html` → ordem das seções, grid de widgets, disposição de KPIs/gráficos/tabelas/filtros.
- Tokens de espaçamento que estiverem bons (sidebar ~260px, topbar ~64px, gutter 24px, card padding 20px).

**DESCARTAR (não copiar)**
- Tailwind via CDN → instalar via npm.
- A paleta de tokens gerada automaticamente pelo Stitch (tokens estilo Material como `surface-container-*`, `on-tertiary-fixed-variant`, `primary` fora do padrão) → usar exclusivamente os tokens canônicos da seção 4. O arquivo `design-reference/deep_intelligence/DESIGN.md` é metadado de tema do Stitch, não uma tela — ignorar.
- Ícones Material Symbols → trocar por Bootstrap Icons.
- Qualquer string em inglês remanescente no HTML → tudo em pt-BR.
- Cores de gráfico com degradê dentro de barras/fatias → usar cores chapadas da paleta categórica.

**Regra de ouro:** o export dita o QUE aparece e ONDE (layout/composição); este CLAUDE.md dita COM QUE (tokens, componentes, formatação, arquitetura).

## 4. DESIGN TOKENS CANÔNICOS (Tailwind config / CSS vars)

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

- Botão primário: `bg-gradient-to-r from-green-400 to-green-500`, texto branco.
- Valores monetários: utilitário com `font-variant-numeric: tabular-nums` (não usar fonte mono).
- Paleta categórica para gráficos (ordem fixa, cores chapadas), num array único `CHART_PALETTE` reutilizado por todos os gráficos:
  `#452C63` (roxo), `#3FBF8F` (verde), `#F0A93B` (âmbar), `#3B82A9` (azul-petróleo), `#8B6DB0` (lilás), `#8FD9A8` (verde claro).
- Cores semânticas de dado: verde = alta/positivo, vermelho suave = queda, âmbar = atenção, roxo = neutro/total.

## 5. REGRAS DE PADRONIZAÇÃO (inegociáveis)

- Marca: "PICOS Analytics" + subtítulo "Automação Comercial" + logo de losangos (`BrandLogo.vue`, SVG) em todas as telas.
- Sidebar única (`AppSidebar.vue`): Visão Geral, Vendas, Produtos, Clientes, Vendedores, Pagamentos, Relatórios, Configurações. Rodapé: avatar + nome + "Sair". Item ativo = barra verde 3px à esquerda + fundo `rgba(255,255,255,0.08)` + texto branco (nunca pill menta preenchido).
- Topbar única (`AppTopbar.vue`): busca global + sino de notificações + avatar.
- Barra de filtros global (`GlobalFilters.vue`): componente único no topo dos dashboards com período (Hoje/7d/30d/Mês/Trimestre/Ano/Personalizado), Loja, Categoria, Forma de pagamento, Vendedor + botões Exportar e Atualizar. Os filtros são estado global (Pinia) e afetam todos os widgets da tela — mudar o período recalcula KPIs e gráficos.
- Um único botão primário (gradiente verde); secundário branco com borda; destrutivo ghost vermelho.
- KPI cards brancos (`KpiCard.vue`) com cor só no valor/ícone e mini-indicador de variação vs. período anterior (seta + % verde/vermelho). Prop `highlight` permite no máx. 1 card roxo sólido por tela (ex.: Faturamento na Visão Geral).
- Gráficos: sempre com eixos e legendas legíveis; cores chapadas da `CHART_PALETTE`; sem degradê dentro de barras/fatias; gráficos combinados usam eixo Y secundário quando as escalas divergem; donuts exibem o total no centro.
- Formatação pt-BR via utilitários únicos (proibido montar "R$" na mão):
  - `formatCurrency(v)` → `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})`
  - `formatCompact(v)` → notação compacta para eixos (ex.: "R$ 12,5 mil")
  - `formatPercent(v)`, `formatDate(d)` (DD/MM/AAAA), `formatDateTime(d)`
- Zero strings em inglês na UI. Dados de exemplo datados de 2026.
- Visual de BI sóbrio: sem glassmorphism, sem gradiente de fundo, sombras `shadow-sm`.

## 6. ESTRUTURA DO PROJETO

```
picos-analytics-web/
├── design-reference/            # export do Stitch (fora do build)
├── src/
│   ├── assets/                  # logo SVG, estilos globais, fontes
│   ├── components/
│   │   ├── layout/              # AppShell, AppSidebar, AppTopbar, PageHeader
│   │   ├── filters/              # GlobalFilters, PeriodPicker
│   │   ├── ui/                   # BaseButton, KpiCard, StatusBadge, DataTable,
│   │   │                         # RankingList, BaseModal, BaseSelect, BaseSwitch,
│   │   │                         # Pagination, EmptyState, SkeletonCard, AppToast
│   │   └── charts/               # ChartTheme.ts (config única ApexCharts), LineAreaChart,
│   │                              # BarChart, HBarChart, DonutChart, ComboChart,
│   │                              # ParetoChart (todos wrappers de vue3-apexcharts)
│   ├── pages/
│   │   ├── LoginPage.vue
│   │   ├── VisaoGeralPage.vue
│   │   ├── VendasPage.vue
│   │   ├── ProdutosPage.vue
│   │   ├── ClientesPage.vue
│   │   ├── VendedoresPage.vue
│   │   ├── PagamentosPage.vue
│   │   ├── RelatoriosPage.vue
│   │   └── ConfiguracoesPage.vue
│   ├── mocks/                    # JSONs — fonte de dados desta fase
│   │   ├── vendas.json           # transações granulares (base de tudo)
│   │   ├── produtos.json
│   │   ├── clientes.json
│   │   ├── vendedores.json
│   │   ├── categorias.json
│   │   └── usuario.json
│   ├── services/                 # camada de dados (seção 7)
│   ├── stores/                   # Pinia: useFiltersStore, useVendasStore, useUiStore
│   ├── composables/               # useFormatters, useAggregations, usePagination
│   ├── router/index.ts
│   ├── types/index.ts
│   └── utils/formatters.ts
```

## 7. CAMADA DE DADOS MOCKADA (crítico para a fase 2)

Nenhum componente/gráfico importa JSON direto. Tudo passa por services assíncronos:

```ts
// services/api.ts — hoje lê JSON local com latência simulada;
// amanhã troca por fetch('/api/...') sem tocar em componentes
export async function apiGet<T>(resource: string): Promise<T> {
  await new Promise(r => setTimeout(r, 250))
  const data = await import(`../mocks/${resource}.json`)
  return structuredClone(data.default) as T
}
```

- `vendas.json` é a base granular (uma linha por transação/item). Todos os KPIs, rankings e gráficos são derivados por agregação dessas transações no composable `useAggregations` + stores — não hardcodar os números dos PNGs. Assim, mudar o filtro de período realmente recalcula tudo.
- Agregações necessárias: faturamento/nº vendas/ticket médio/itens por período; série temporal por dia; vendas por dia-da-semana e por hora; distribuição por forma de pagamento; top produtos (qtd e R$); top vendedores; top clientes; vendas por categoria; curva ABC/Pareto; novos vs. recorrentes.
- Estados de loading (skeletons nos widgets) e empty states em toda listagem e gráfico.
- Exportações (PDF/Excel) nesta fase são apenas visuais → toast "disponível em breve".

### Modelos (`types/index.ts`)

```ts
type FormaPagamento = 'dinheiro' | 'pix' | 'credito' | 'debito'
type StatusVenda = 'concluida' | 'cancelada' | 'estornada'

interface Venda { id: string; numero: string; dataHora: string; vendedorId: string;
  clienteId: string | null; formaPagamento: FormaPagamento; status: StatusVenda;
  itens: ItemVenda[]; total: number }
interface ItemVenda { produtoId: string; categoriaId: string; quantidade: number;
  precoUnit: number; custoUnit: number }
interface Produto { id: string; sku: string; nome: string; categoriaId: string;
  preco: number; custo: number; estoque: number }
interface Cliente { id: string; nome: string; primeiraCompra: string; ultimaCompra: string }
interface Vendedor { id: string; nome: string; avatar?: string; metaMensal: number }
interface Categoria { id: string; nome: string; icone: string } // icone = classe bi-*
```

### Seeds dos mocks (realistas, para os gráficos ficarem convincentes)

- ~15 produtos em 5–6 categorias, ~6 vendedores (com metas), ~40 clientes.
- ~800–1.200 transações distribuídas por jan–jul/2026, com sazonalidade (picos em fins de semana e horários de pico), mix de formas de pagamento e alguns cancelamentos/estornos — volume suficiente para série temporal, curva ABC e heatmap de horário terem forma real.

## 8. PÁGINAS — REQUISITOS RESUMIDOS (detalhe visual = seguir o PNG correspondente)

- **Visão Geral**: 4–5 KPIs (Faturamento destacado, Nº de vendas, Ticket médio, Itens, Meta do mês com progresso) + linha/área de faturamento no tempo (com linha de meta) + barras por dia-da-semana/hora + donut de formas de pagamento + Top 5 produtos + Top 5 vendedores + vendas por categoria.
- **Vendas**: KPIs + combo (barras faturamento + linha nº vendas, eixo secundário) + comparativo período atual vs. anterior + tabela de vendas (data/hora, cupom, vendedor, itens, pagamento, total, status) com busca/ordenação/paginação + cards (maior venda, dia de pico, horário de pico).
- **Produtos**: KPIs + ranking mais vendidos (toggle qtd/faturamento) + Pareto/curva ABC + barras por categoria + alerta de estoque baixo x giro + tabela (SKU, nome, categoria, qtd, faturamento, ticket, margem %).
- **Clientes**: KPIs + novos vs. recorrentes no tempo + top clientes + segmentação (VIP/Regular/Ocasional) + tabela.
- **Vendedores**: KPIs + ranking com % de meta (barra verde) + comparativo de desempenho + tabela com tendência.
- **Pagamentos**: 4 KPIs por forma (com % do total) + donut + evolução no tempo + tabela por forma (transações, valor, ticket, % do faturamento).
- **Relatórios**: grid de cards exportáveis + pré-visualização com filtros; PDF/Excel só visual (toast).
- **Configurações**: Perfil (mock, badge verde "Conta Google vinculada", desvincular ghost vermelho) + Organização (nome, CNPJ, logo) + Metas (faturamento mensal e por vendedor) + Preferências (toggles verdes) + barra fixa Cancelar/Salvar (salva na store + toast).
- **Login**: split-screen; painel roxo com padrão sutil de losangos (opacidade ≤15%) + botão "Entrar com Google" (mockado: seta usuário na store e navega à Visão Geral). Sem login por e-mail.

## 9. RESPONSIVIDADE

- ≥1280px: sidebar fixa 260px; grid de widgets multi-coluna.
- 768–1279px: sidebar em ícones (64px) com tooltip; grid de widgets em 2 colunas.
- <768px: sidebar vira drawer (Reka Dialog) por hambúrguer na topbar; barra de filtros colapsa em botão "Filtros" que abre um sheet; KPIs e widgets empilham em 1 coluna; tabelas viram cards empilhados; gráficos mantêm proporção (scroll horizontal se necessário).

## 10. ORDEM DE CONSTRUÇÃO (por commits)

1. Scaffold Vite + Vue 3 + TS + Tailwind + Reka UI + Bootstrap Icons + Router + Pinia + vue3-apexcharts; tokens no Tailwind config; `ChartTheme.ts`.
2. Design system: BaseButton, KpiCard, StatusBadge, DataTable, RankingList, BaseModal, BaseSelect/Switch, Pagination, Skeleton, EmptyState, formatters + página `/dev/ui` exibindo todos os componentes e um exemplo de cada gráfico.
3. Layout: AppShell + AppSidebar + AppTopbar + PageHeader + GlobalFilters + rotas com placeholders.
4. Mocks (com o seed volumoso de vendas) + services + stores + composable `useAggregations`.
5. Visão Geral (valida agregações e o tema de gráficos de ponta a ponta).
6. Vendas (valida tabela analítica + combo chart + reatividade aos filtros).
7. Produtos → Pagamentos → Vendedores → Clientes.
8. Relatórios → Configurações → Login.
9. Passada final: reatividade dos filtros globais em todas as telas, skeletons/empty states, responsividade + checklist da seção 11.

## 11. CRITÉRIOS DE ACEITE

- [ ] `npm run dev` e `npm run build` sem erros; zero warnings de TS.
- [ ] Nenhum CDN; nenhum Material Symbol; nenhum token `surface-container-*`.
- [ ] Sidebar, topbar e barra de filtros idênticas em todas as telas (componentes únicos).
- [ ] Telas fiéis aos `screen.png` do export, com os tokens canônicos aplicados por cima.
- [ ] Mudar o período/filtro global recalcula KPIs, rankings e gráficos em todas as telas (dados derivados, não hardcodados).
- [ ] Todos os gráficos usam a `CHART_PALETTE`, têm eixos/legendas legíveis e nenhum degradê nas séries; donuts com total no centro.
- [ ] pt-BR em 100% da UI; R$ e datas apenas via formatters.
- [ ] Responsivo verificado em 1440px, 1024px, 768px e 375px.
