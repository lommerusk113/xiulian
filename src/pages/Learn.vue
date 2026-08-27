<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Unit } from '../types'
import { units } from '../data'
import { unitLearned, unitLocked, nextUnit, lessonStrength, knownCount, progress, stageAtUnit, stageLabel, themeUnitsFor, STAGES, TIER_COLORS } from '../store'

/** which realm each HSK band feeds once its words are known — HSK 1 also carries the unit-based 聚气 markers below */
const REALM_FOR: Record<string, string> = { 'HSK 1': '炼气 Qi Refining', 'HSK 2': '筑基 Foundation', 'HSK 3': '金丹 Golden Core', 'HSK 4': '元婴 Nascent Soul' }
const track = ref<'theme' | 'core' | 'media'>((localStorage.getItem('xiulian.track') as 'theme' | 'core' | 'media') ?? 'theme')
watch(track, (t) => localStorage.setItem('xiulian.track', t))
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
/** Ring: current tier fills over the previous tier's colour. One map per render — the core list has 300+ rows. */
const rings = computed(() => {
  const m = new Map<string, ReturnType<typeof lessonStrength> & { style: string }>()
  for (const u of units.filter((u) => u.track === track.value)) {
    const s = lessonStrength(u.id)
    // one solid colour per ring count: ×1 orange, ×2 yellow, ×3 green … ; empty until the first completion
    m.set(u.id, { ...s, style: `background: ${s.tier ? TIER_COLORS[s.tier % TIER_COLORS.length] : 'var(--ui-bg-accented)'}` })
  }
  return m
})
const ring = (id: string) => rings.value.get(id)!
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Learn</h1>
      <UButton to="/sounds" color="neutral" variant="soft" icon="i-lucide-ear">Sounds &amp; tones</UButton>
    </div>
    <UTabs v-model="track" :items="tabs" :content="false" />
    <p v-if="knownCount" class="text-sm text-muted -mt-2">
      <template v-if="track === 'media'">Recurring words from xianxia / wuxia shows and comics. Not HSK — but you'll hear them every episode. </template>
      <template v-else-if="track === 'theme'">Words by theme, drilled with heavy repetition; each lesson ends with sentences mixing them with what you already know. </template>
      <template v-else>Strict lessons that carry your rank: the markers show where each 突破 (breakthrough) unlocks. Opening a unit lists the theme lessons that prepare you for it. </template>
      Every completion adds one ring. Theme rings fade one at a time — daily at first, slower with every completion, never after ten — so stack them to bank days off. In HSK only your furthest unit fades, one completion's worth per missed day. HSK units unlock in order.
    </p>

    <section v-for="[name, list] in groups" :key="name" class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <UIcon v-if="list[0].icon" :name="list[0].icon" class="text-primary" />
        <h2 class="font-semibold flex-1">{{ name }} <span v-if="groupPct(list)" class="text-muted text-sm font-normal">{{ groupPct(list) }}% of words started</span></h2>
      </div>
      <p v-if="track === 'core' && REALM_FOR[name]" class="text-xs text-muted -mt-1 flex items-center gap-2">
        <UIcon name="i-lucide-zap" class="size-3.5" />
        <span><span class="hanzi">{{ REALM_FOR[name] }}</span> — earned as these words become <b>known</b> (remembered for weeks), not by finishing units; the bar on Home tracks it.</span>
      </p>
      <template v-for="(u, i) in list" :key="u.id">
      <component
        :is="unitLocked(u.id) ? 'div' : 'RouterLink'"
        :to="unitLocked(u.id) ? undefined : `/session/learn/${u.id}`"
        class="flex items-center gap-4 rounded-xl border border-default bg-elevated/50 p-3"
        :class="unitLocked(u.id) ? 'opacity-50' : ['hover:border-primary', u.id === nextUnit?.id && 'border-primary']"
      >
        <div class="size-12 shrink-0 rounded-full grid place-items-center text-sm font-semibold tabular-nums" :style="ring(u.id).style">
          <span class="size-9 rounded-full bg-default grid place-items-center">
            <UIcon v-if="unitLocked(u.id)" name="i-lucide-lock" class="size-4 text-muted" />
            <template v-else-if="ring(u.id).tier">×{{ ring(u.id).tier }}</template>
            <template v-else>{{ i + 1 }}</template>
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-medium">{{ u.title }}</p>
          <p class="hanzi text-muted text-sm truncate">{{ u.wordIds.map((w) => w.replace('~m', '')).join(' ') }}</p>
        </div>
        <div class="text-right text-xs text-muted shrink-0">
          <p>{{ unitLearned(u.id) }}/{{ u.wordIds.length }} words</p>
          <p v-if="u.track === 'core' && !progress.lessons[u.id] && themeUnitsFor(u.id).length" :class="themeUnitsFor(u.id).every((p) => p.done) ? 'text-success' : ''">
            themes {{ themeUnitsFor(u.id).filter((p) => p.done).length }}/{{ themeUnitsFor(u.id).length }}
          </p>
          <p v-if="ring(u.id).fading && ring(u.id).strength > 0">−1 ring / {{ ring(u.id).days }} day{{ ring(u.id).days === 1 ? '' : 's' }}</p>
        </div>
      </component>
      <div v-if="track === 'core' && name === 'HSK 1' && stageAtUnit(i + 1)" class="flex items-center gap-3 px-3 text-sm" :class="progress.tribulations[stageAtUnit(i + 1)!] ? 'text-muted' : 'text-primary'">
        <div class="flex-1 h-px" :class="progress.tribulations[stageAtUnit(i + 1)!] ? 'bg-accented' : 'bg-primary/40'" />
        <UIcon :name="progress.tribulations[stageAtUnit(i + 1)!] ? 'i-lucide-check' : 'i-lucide-zap'" class="size-4" />
        <span class="hanzi">{{ STAGES[stageAtUnit(i + 1)!].rite }} · {{ stageLabel(STAGES[stageAtUnit(i + 1)!]).realm }}{{ stageLabel(STAGES[stageAtUnit(i + 1)!]).sub }}</span>
        <span class="text-muted">{{ stageLabel(STAGES[stageAtUnit(i + 1)!]).name }}</span>
        <div class="flex-1 h-px" :class="progress.tribulations[stageAtUnit(i + 1)!] ? 'bg-accented' : 'bg-primary/40'" />
      </div>
      </template>
    </section>
  </div>
</template>
