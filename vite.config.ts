import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:8080' } },
  plugins: [
    vue(),
    ui({
      ui: { colors: { primary: 'red', neutral: 'zinc' } },
      icon: { clientBundle: { scan: true } },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Xiulian',
        short_name: 'Xiulian',
        theme_color: '#dc2626',
        background_color: '#09090b',
        display: 'standalone',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json,woff2}'], maximumFileSizeToCacheInBytes: 6_000_000 },
    }),
  ],
})
