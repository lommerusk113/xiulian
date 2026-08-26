<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../data'
import { challengeHistory, todaysChallenge, CHALLENGE_SIZE, progress, dueIds, knownCount, matureCount, nextUnit, streak, rank, bandStats, coverage, REALMS, STAGES, stage, nextStage, stageValue, stageLabel, TIER_COLORS } from '../store'

const coreTotal = words.filter((w) => w.level > 0).length
const readibu = computed(() => Math.round((matureCount.value / coreTotal) * 100))
const challenge = computed(() => todaysChallenge())
const best = computed(() => (challenge.value.attempts.length ? Math.max(...challenge.value.attempts) : null))
const history = computed(() => challengeHistory())
const hour = new Date().getHours()
const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

// realm hero: the current stage in its realm's colour, one bar toward the next stage
const current = computed(() => stageLabel(STAGES[stage.value]))
const accent = computed(() => TIER_COLORS[STAGES[stage.value].realm % TIER_COLORS.length])
const toNext = computed(() => {
  const n = nextStage.value
  if (!n) return null
  const value = stageValue(n)
  const started = n.metric === 'known' && value > 0 ? bandStats.value[n.band - 1].started : value
  return { ...stageLabel(n), value, target: n.target, band: n.band, metric: n.metric, pct: Math.min(100, (value / n.target) * 100), ghost: Math.min(100, (started / n.target) * 100) }
})
const realmHanzi = (r: string) => r.split(' ')[0]
// ponytail: cards carry no "created" stamp, so a word counts as met today if its last review is today and no full day has passed since the one before — first-day cards always match
const today = computed(() => {
  const midnight = new Date().setHours(0, 0, 0, 0)
  return Object.values(progress.cards).filter((c) => c.last_review && c.last_review.getTime() >= midnight && c.elapsed_days === 0).length
})
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div>
      <h1 class="hanzi text-3xl font-bold">{{ greeting }}</h1>
      <p class="text-muted text-sm">{{ hour < 12 ? 'zǎoshang hǎo' : hour < 18 ? 'xiàwǔ hǎo' : 'wǎnshang hǎo' }} — good {{ hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening' }}</p>
    </div>

    <UButton v-if="dueIds.length" size="xl" block icon="i-lucide-brain" to="/session/review">Review {{ dueIds.length }} due</UButton>
    <UButton v-else-if="!knownCount && nextUnit" size="xl" block icon="i-lucide-sparkles" :to="`/session/learn/${nextUnit.id}`">Get started — your first 10 words</UButton>
    <UButton v-else size="xl" block icon="i-lucide-book-open" to="/learn">Continue learning</UButton>

    <UCard :style="`--accent:${accent}`" class="ring-(--accent)/40">
      <div class="flex items-start gap-4">
        <div class="flex-1 min-w-0">
          <p class="hanzi leading-none text-(--accent)"><span class="text-5xl font-bold">{{ current.realm }}</span><span v-if="current.sub" class="text-2xl font-semibold ml-2">{{ current.sub }}</span></p>
          <p class="font-semibold mt-1">{{ current.name }} <span class="text-muted font-normal text-sm">· HSK rank {{ rank }}</span></p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-2xl font-bold tabular-nums flex items-center justify-end gap-1"><UIcon name="i-lucide-flame" :class="streak ? 'text-(--accent)' : 'text-muted'" />{{ streak }}</p>
          <p class="text-xs text-muted">day streak</p>
          <UBadge v-if="today" color="primary" variant="subtle" size="sm" class="mt-1 animate-pulse">{{ today }} words met today</UBadge>
        </div>
      </div>

      <div v-if="toNext" class="mt-4">
        <div class="h-2.5 rounded-full bg-accented overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-(--accent)/30 transition-[width] duration-700" :style="`width:${toNext.ghost}%`" />
          <div class="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-700" :style="`width:${toNext.pct}%`" />
        </div>
        <p class="text-sm text-muted mt-2">
          <span class="tabular-nums text-default font-medium">{{ toNext.value }} / {{ toNext.target }}</span> HSK {{ toNext.band }} {{ toNext.metric === 'completed' ? 'units completed' : 'words known' }}
          → <span class="hanzi text-default">{{ toNext.realm }}{{ toNext.sub }}</span>
        </p>
      </div>
      <p v-else class="text-sm text-muted mt-4">Every realm earned — go read.</p>

      <div class="flex items-center mt-4">
        <template v-for="(r, i) in REALMS" :key="r">
          <div v-if="i" class="flex-1 h-px" :class="i <= STAGES[stage].realm ? 'bg-(--accent)' : 'bg-accented'" />
          <div class="flex flex-col items-center gap-1" :title="r">
            <div class="size-3 rounded-full" :class="i < STAGES[stage].realm ? 'bg-(--accent)' : i === STAGES[stage].realm ? 'bg-(--accent) ring-4 ring-(--accent)/25' : i === STAGES[stage].realm + 1 ? 'border-2 border-(--accent)/60' : 'bg-accented'" />
            <span class="hanzi text-[10px] leading-none" :class="i === STAGES[stage].realm ? 'text-default' : 'text-muted'">{{ realmHanzi(r) }}</span>
          </div>
        </template>
      </div>
      <p class="text-xs text-muted mt-3">A word is <b>started</b> after its first lesson and <b>known</b> once you've remembered it for about three weeks. Readibu's easiest stories open up around <span class="hanzi">金丹</span>.</p>
    </UCard>

    <template v-if="knownCount">
      <UCard>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted uppercase tracking-wide">Daily challenge</p>
            <p class="text-lg font-semibold">
              <template v-if="best === null">Not attempted yet</template>
              <template v-else>Best {{ best }} / {{ CHALLENGE_SIZE }} <span class="text-muted text-sm font-normal">· {{ challenge.attempts.length }} tr{{ challenge.attempts.length === 1 ? 'y' : 'ies' }}</span></template>
            </p>
          </div>
          <UButton icon="i-lucide-swords" color="neutral" to="/session/challenge">{{ best === null ? 'Take it' : 'Again' }}</UButton>
        </div>
        <div class="flex items-end gap-1.5 h-12 mt-3">
          <div v-for="(d, i) in history" :key="i" class="flex-1 flex flex-col items-center justify-end gap-1" :title="d.best === null ? 'no attempt' : `${d.best}/${CHALLENGE_SIZE}`">
            <div class="w-full rounded-t" :class="d.best === null ? 'bg-accented' : i === history.length - 1 ? 'bg-primary' : 'bg-primary/50'" :style="`height:${d.best === null ? 3 : Math.max(4, (d.best / CHALLENGE_SIZE) * 32)}px`" />
            <span class="text-[10px] text-muted">{{ d.day }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <p class="font-medium text-sm mb-3">Road to Readibu <span class="text-muted font-normal">· {{ readibu }}% known</span></p>
        <div class="flex flex-col gap-3">
          <div v-for="b in bandStats" :key="b.level" class="flex items-center gap-3 text-sm">
            <span class="w-12 text-muted">HSK {{ b.level }}</span>
            <div class="flex-1 h-2 rounded-full bg-accented overflow-hidden relative">
              <div class="absolute inset-y-0 left-0 bg-primary/30" :style="`width:${(b.started / b.total) * 100}%`" />
              <div class="absolute inset-y-0 left-0 bg-primary" :style="`width:${(b.known / b.total) * 100}%`" />
            </div>
            <span class="w-20 text-right tabular-nums text-muted">{{ b.known }} / {{ b.total }}</span>
          </div>
        </div>
      </UCard>

      <div class="text-sm text-muted px-1">
        <div class="flex justify-between mb-1"><span>Subtitle coverage</span><span class="tabular-nums">{{ (coverage.known * 100).toFixed(1) }}% known · {{ (coverage.started * 100).toFixed(1) }}% started</span></div>
        <div class="h-1 rounded-full bg-accented overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-primary/30" :style="`width:${coverage.started * 100}%`" />
          <div class="absolute inset-y-0 left-0 bg-primary" :style="`width:${coverage.known * 100}%`" />
        </div>
      </div>
    </template>
  </div>
</template>
