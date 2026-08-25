import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('./pages/Home.vue') },
  { path: '/learn', component: () => import('./pages/Learn.vue') },
  { path: '/session/:mode/:unit?', component: () => import('./pages/Session.vue'), props: true },
  { path: '/words', component: () => import('./pages/Words.vue') },
  { path: '/build', component: () => import('./pages/Builder.vue') },
  { path: '/sounds', component: () => import('./pages/Sounds.vue') },
  { path: '/settings', component: () => import('./pages/Settings.vue') },
]
