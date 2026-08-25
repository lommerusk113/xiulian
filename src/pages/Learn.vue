<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Unit } from '../types'
import { units } from '../data'
import { unitLearned, nextUnit, lessonStrength, TIER_COLORS } from '../store'

const track = ref<'theme' | 'core' | 'media'>('theme')
const tabs = [
  { label: 'Themes', value: 'theme', icon: 'i-lucide-layers' },
  { label: 'HSK core', value: 'core', icon: 'i-lucide-graduation-cap' },
  { label: 'Donghua', value: 'media', icon: 'i-lucide-swords' },
]
const groups = computed(() => {
  const list = units.filter((u) => u.track === track.value)
  const by = new Map<string, Unit[]>()
  for (const u of list) {
    const key = track.value === 'core' ? u.title.split(' · ')[0] : track.value === 'theme' ? u.theme! : u.title.replace(/ \d+$/, '')
    by.set(key, [...(by.get(key) ?? []), u])
  }
  return [...by.entries()]
})
const groupPct = (list: Unit[]) => {
  const total = list.reduce((s, u) => s + u.wordIds.length, 0)
  return Math.round((list.reduce((s, u) => s + unitLearned(u.id), 0) / total) * 100)
}
/** Ring: current tier fills over the previous tier's colour. */
function ring(id: string) {
  const s = lessonStrength(id)
  const fill = s.tier ? TIER_COLORS[s.tier % TIER_COLORS.length] : 'var(--ui-primary)'
  const base = s.tier ? TIER_COLORS[(s.tier - 1) % TIER_COLORS.length] : 'var(--ui-bg-accented)'
  return { ...s, style: `background: conic-gradient(${fill} ${s.strength % 100}%, ${base} 0)` }
}
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Learn</h1>
      <UButton to="/sounds" color="neutral" variant="soft" icon="i-lucide-ear" size="sm">Sounds &amp; tones</UButton>
    </div>
    <UTabs v-model="track" :items="tabs" :content="false" />
    <p class="text-sm text-muted -mt-2">
      <template v-if="track === 'media'">Recurring words from xianxia / wuxia shows and comics. Not HSK — but you'll hear them every episode. </template>
      <template v-else-if="track === 'theme'">Words by theme, drilled with heavy repetition; each lesson ends with sentences mixing them with what you already know. </template>
      Each completion adds a ring (+100%); rings fade daily unless you repeat — the more often you've done a lesson, the slower it fades.
    </p>

    <section v-for="[name, list] in groups" :key="name" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <UIcon v-if="list[0].icon" :name="list[0].icon" class="text-primary" />
        <h2 class="font-semibold flex-1">{{ name }} <span class="text-muted text-sm font-normal">{{ groupPct(list) }}% of words started</span></h2>
      </div>
      <RouterLink
        v-for="(u, i) in list"
        :key="u.id"
        :to="`/session/learn/${u.id}`"
        class="flex items-center gap-4 rounded-xl border border-default bg-elevated/50 p-3 hover:border-primary"
        :class="u.id === nextUnit?.id && 'border-primary'"
      >
        <div class="size-12 shrink-0 rounded-full grid place-items-center text-sm font-semibold tabular-nums" :style="ring(u.id).style">
          <span class="size-9 rounded-full bg-default grid place-items-center">
            <template v-if="ring(u.id).tier">×{{ ring(u.id).tier }}</template>
            <template v-else>{{ i + 1 }}</template>
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ u.title }}</p>
          <p class="hanzi text-muted text-sm truncate">{{ u.wordIds.map((w) => w.replace('~m', '')).join(' ') }}</p>
        </div>
        <div class="text-right text-xs text-muted shrink-0">
          <p>{{ unitLearned(u.id) }}/{{ u.wordIds.length }} words</p>
          <p v-if="ring(u.id).completions">−{{ ring(u.id).loss }}%/day</p>
        </div>
      </RouterLink>
    </section>
  </div>
</template>
