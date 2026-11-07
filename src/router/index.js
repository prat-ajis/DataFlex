import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard' } },
  {
    path: '/convert',
    name: 'convert',
    component: () => import('@/views/ConverterView.vue'),
    meta: { title: 'Konversi' },
  },
  {
    path: '/templates',
    name: 'templates',
    component: () => import('@/views/TemplatesView.vue'),
    meta: { title: 'Template' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  document.title = to.meta?.title ? `${to.meta.title} · DataFlex` : 'DataFlex'
})

export default router

