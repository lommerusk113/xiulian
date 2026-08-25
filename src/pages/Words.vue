<script setup lang="ts">
import { computed, ref } from 'vue'
import { State } from 'ts-fsrs'
import { words } from '../data'
import { progress, isMastered } from '../store'
import { speak } from '../tts'

const q = ref('')
const filter = ref<'all' | 'learning' | 'known' | 'due' | 'new'>('all')
const filters = [
  { label: 'All', value: 'all' },
  { label: 'Learning', value: 'learning' },
  { label: 'Known', value: 'known' },
  { label: 'Due', value: 'due' },
  { label: 'Not started', value: 'new' },
]
const stripTones = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function status(id: string) {
  const c = progress.cards[id]
  if (!c) return null
  if (c.due.getTime() <= Date.now()) return { label: 'due', color: 'warning' as const }
  if (isMastered(id)) return { label: 'known', color: 'success' as const }
  if (c.state === State.Review) return { label: `${Math.round(c.stability)}d`, color: 'info' as const }
  return { label: 'learning', color: 'info' as const }
}

const list = computed(() => {
  const s = q.value.trim().toLowerCase()
  return words
    .filter((w) => {
      const st = status(w.id)
      if (filter.value === 'new' && st) return false
      if (filter.value === 'learning' && (!st || st.label === 'known')) return false
      if (filter.value === 'known' && st?.label !== 'known') return false
      if (filter.value === 'due' && st?.label !== 'due') return false
      return !s || w.hanzi.includes(s) || stripTones(w.pinyin).includes(stripTones(s)) || w.meaning.toLowerCase().includes(s)
    })
    .slice(0, 150)
})
</script>

<template>
  <div class="flex flex-col gap-4 py-6">
    <h1 class="text-2xl font-bold">Words</h1>
    <UInput v-model="q" icon="i-lucide-search" size="lg" placeholder="Search hanzi, pinyin or meaning" />
    <UTabs v-model="filter" :items="filters" :content="false" size="sm" />
    <ul class="divide-y divide-default">
      <li v-for="w in list" :key="w.id" class="flex items-center gap-3 py-3 cursor-pointer" @click="speak(w.hanzi)">
        <span class="hanzi text-2xl w-16 shrink-0">{{ w.hanzi }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-primary">{{ w.pinyin }}</p>
          <p class="text-sm text-muted truncate">{{ w.meaning }}</p>
        </div>
        <UBadge v-if="status(w.id)" :color="status(w.id)!.color" variant="subtle" size="sm">{{ status(w.id)!.label }}</UBadge>
        <UBadge v-else color="neutral" variant="subtle" size="sm">{{ w.level ? `HSK ${w.level}` : 'media' }}</UBadge>
      </li>
    </ul>
    <p v-if="list.length === 150" class="text-center text-xs text-muted">Showing first 150 — refine your search.</p>
  </div>
</template>
