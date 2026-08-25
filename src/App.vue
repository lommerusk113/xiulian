<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { dueIds } from './store'

const route = useRoute()
const inSession = computed(() => route.path.startsWith('/session') || route.path === '/login')
const links = [
  { to: '/', label: 'Home', icon: 'i-lucide-house' },
  { to: '/learn', label: 'Learn', icon: 'i-lucide-book-open' },
  { to: '/build', label: 'Build', icon: 'i-lucide-blocks' },
  { to: '/words', label: 'Words', icon: 'i-lucide-list' },
  { to: '/settings', label: 'Settings', icon: 'i-lucide-settings' },
]
</script>

<template>
  <UApp>
    <div class="min-h-dvh flex flex-col md:flex-row">
      <nav v-if="!inSession" class="hidden md:flex flex-col w-56 shrink-0 border-r border-default p-4 gap-1 sticky top-0 h-dvh">
        <RouterLink to="/" class="hanzi text-2xl font-bold px-3 py-2 mb-4">修炼 <span class="text-primary">Xiulian</span></RouterLink>
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-muted hover:bg-elevated hover:text-default"
          exact-active-class="bg-elevated text-default font-medium"
        >
          <UIcon :name="l.icon" class="size-5" />
          {{ l.label }}
          <UBadge v-if="l.to === '/' && dueIds.length" color="primary" size="sm" class="ml-auto">{{ dueIds.length }}</UBadge>
        </RouterLink>
      </nav>

      <main class="flex-1 w-full max-w-2xl mx-auto px-4 pt-safe" :class="inSession ? 'pb-4' : 'pb-24 md:pb-8'">
        <RouterView />
      </main>

      <nav v-if="!inSession" class="md:hidden fixed bottom-0 inset-x-0 border-t border-default bg-default/90 backdrop-blur pb-safe flex">
        <RouterLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-muted relative"
          exact-active-class="text-primary"
        >
          <UIcon :name="l.icon" class="size-6" />
          {{ l.label }}
          <span v-if="l.to === '/' && dueIds.length" class="absolute top-1 right-1/4 size-2 rounded-full bg-primary" />
        </RouterLink>
      </nav>
    </div>
  </UApp>
</template>
