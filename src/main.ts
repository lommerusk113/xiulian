import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import ui from '@nuxt/ui/vue-plugin'
import './main.css'
import App from './App.vue'
import { routes } from './routes'

const router = createRouter({ history: createWebHashHistory(), routes })
createApp(App).use(router).use(ui).mount('#app')
