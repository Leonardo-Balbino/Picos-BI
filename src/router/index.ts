import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import { useAuthStore } from '@/stores/useAuthStore'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/dev/ui',
      name: 'dev-ui',
      component: () => import('@/pages/DevUiPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: AppShell,
      children: [
        { path: '', redirect: '/visao-geral' },
        { path: 'visao-geral', name: 'visao-geral', component: () => import('@/pages/VisaoGeralPage.vue') },
        { path: 'vendas', name: 'vendas', component: () => import('@/pages/VendasPage.vue') },
        { path: 'produtos', name: 'produtos', component: () => import('@/pages/ProdutosPage.vue') },
        { path: 'clientes', name: 'clientes', component: () => import('@/pages/ClientesPage.vue') },
        { path: 'vendedores', name: 'vendedores', component: () => import('@/pages/VendedoresPage.vue') },
        { path: 'pagamentos', name: 'pagamentos', component: () => import('@/pages/PagamentosPage.vue') },
        { path: 'relatorios', name: 'relatorios', component: () => import('@/pages/RelatoriosPage.vue') },
        { path: 'configuracoes', name: 'configuracoes', component: () => import('@/pages/ConfiguracoesPage.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/visao-geral' },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.autenticado) {
    return { path: '/login' }
  }
  if (to.path === '/login' && auth.autenticado) {
    return { path: '/visao-geral' }
  }
  return true
})

export default router
