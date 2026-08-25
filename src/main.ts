import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import './main.css'
import App from './App.vue'
import { routes } from './routes'
import { getToken } from './api'
import { startSync } from './sync'

const router = createRouter({ history: createWebHashHistory(), routes })
router.beforeEach((to) => (!getToken() && to.path !== '/login' ? '/login' : true))
startSync()
createApp(App).use(router).use(ui).mount('#app')
