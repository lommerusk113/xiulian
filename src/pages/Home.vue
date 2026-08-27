<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../data'
import { challengeHistory, todaysChallenge, CHALLENGE_SIZE, progress, dueIds, knownCount, matureCount, nextUnit, streak, rank, bandStats, bandCompleted, coverage, REALMS, REALM_COLORS, STAGES, stage, nextStage, pendingStage, pendingBlocked, stageValue, stageLabel, trialDue, trialDaysLeft, trialWords, TRIAL_MIN_WORDS, latestIn, lessonStrength, retention7, readableSentences, READ_SIZE, pathToNextStage } from '../store'
import { units } from '../data'

const coreTotal = words.filter((w) => w.level > 0).length
const readibu = computed(() => Math.round((matureCount.value / coreTotal) * 100))
const challenge = computed(() => todaysChallenge())
const best = computed(() => (challenge.value.attempts.length ? Math.max(...challenge.value.attempts) : null))
const history = computed(() => challengeHistory())
const hour = new Date().getHours()
const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

// realm hero: the current stage in its realm's colour, one bar toward the next stage
const current = computed(() => stageLabel(STAGES[stage.value]))
const accent = computed(() => REALM_COLORS[STAGES[stage.value].realm])
const toNext = computed(() => {
  const n = nextStage.value
  if (!n) return null
  const value = stageValue(n)
  const started = n.metric === 'known' && value > 0 ? bandStats.value[n.band - 1].started : value
  return { ...stageLabel(n), value, target: n.target, band: n.band, metric: n.metric, pct: Math.min(100, (value / n.target) * 100), ghost: Math.min(100, (started / n.target) * 100) }
})
const realmHanzi = (r: string) => r.split(' ')[0]
const firstTheme = units.find((u) => u.track === 'theme')
const readable = computed(() => readableSentences().length)
const BACKLOG = 40
/** Readibu milestone per great realm: read one chapter, tick it off. */
const READ_AT: Record<number, string> = { 3: "Readibu's HSK 2 graded stories", 4: "Readibu's HSK 3–4 shelf", 5: 'a real xianxia web novel — with the Sect, Cultivation and Narration decks done' }
const realmNow = computed(() => STAGES[stage.value].realm)
const path = computed(() => pathToNextStage())
// rings that lose a tier tonight unless repeated: the latest HSK/media lesson, and every theme lesson within one day's loss of dropping
const fading = computed(() => {
  const latest = (['core', 'media'] as const).map((t) => latestIn(t)).filter((id): id is string => !!id)
  const themes = Object.keys(progress.lessons).filter((id) => units.find((u) => u.id === id)?.track === 'theme')
  const tomorrow = Date.now() + 86_400_000
  return [...latest, ...themes]
    .map((id) => ({ unit: units.find((u) => u.id === id)!, ...lessonStrength(id) }))
    .filter((f) => f.strength > 0 && lessonStrength(f.unit.id, tomorrow).tier < f.tier)
    .filter((f) => !(f.unit.track === 'core' && f.unit.wordIds.every((w) => progress.cards[w]?.state === 2)))
    .slice(0, 4)
})
const pending = computed(() => (pendingStage.value !== undefined ? { index: pendingStage.value, ...stageLabel(STAGES[pendingStage.value]) } : null))
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

    <template v-if="!knownCount && firstTheme">
      <UButton size="xl" block icon="i-lucide-sparkles" :to="`/session/learn/${firstTheme.id}`">Start gently — {{ firstTheme.wordIds.length }} words, no hearts</UButton>
      <UButton size="lg" block color="neutral" variant="soft" icon="i-lucide-ear" to="/sounds">5 minutes on tones first</UButton>
    </template>
    <template v-else>
      <UButton v-if="dueIds.length > BACKLOG" size="xl" block icon="i-lucide-brain" to="/session/review">Clear reviews first · {{ dueIds.length }} due</UButton>
      <UButton v-else-if="dueIds.length" size="xl" block icon="i-lucide-brain" to="/session/review">Review {{ dueIds.length }} due</UButton>
      <UButton v-if="nextUnit" size="xl" block icon="i-lucide-book-open" :to="`/session/learn/${nextUnit.id}`" :color="dueIds.length ? 'neutral' : 'primary'" :variant="dueIds.length ? 'soft' : 'solid'" :class="dueIds.length > BACKLOG && 'opacity-70'">Continue · {{ nextUnit.title }}</UButton>
      <UButton v-else size="xl" block icon="i-lucide-book-open" to="/learn" :color="dueIds.length ? 'neutral' : 'primary'" :variant="dueIds.length ? 'soft' : 'solid'">Continue learning</UButton>
    </template>

    <UCard :style="`--accent:${accent}`" class="ring-(--accent)/40">
      <div class="flex items-start gap-4">
        <div class="flex-1 min-w-0">
          <p class="hanzi leading-none text-(--accent)"><span class="text-5xl font-bold">{{ current.realm }}</span><span v-if="current.sub" class="text-2xl font-semibold ml-2">{{ current.sub }}</span></p>
          <p class="font-semibold mt-1">{{ current.name }} <span class="text-muted font-normal text-sm">· HSK rank {{ rank }}</span></p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-2xl font-bold tabular-nums flex items-center justify-end gap-1" title="Any graded answer or daily challenge keeps the streak"><UIcon name="i-lucide-flame" :class="streak ? 'text-(--accent)' : 'text-muted'" />{{ streak }}</p>
          <p class="text-xs text-muted">day streak</p>
          <UBadge v-if="today" color="primary" variant="subtle" size="sm" class="mt-1 animate-pulse">{{ today }} words met today</UBadge>
        </div>
      </div>

      <UButton v-if="pending" size="xl" block class="mt-4" icon="i-lucide-zap" :to="`/session/tribulation/${pending.index}`">
        <span class="hanzi">{{ STAGES[pending.index].rite }}</span> — {{ STAGES[pending.index].rite === '天劫' ? 'face the heavenly tribulation for' : 'break through to' }} <span class="hanzi">{{ pending.realm }}{{ pending.sub }}</span> {{ pending.name }}
      </UButton>
      <p v-else-if="pendingBlocked === 'failed'" class="mt-4 text-sm text-muted"><span class="hanzi text-default">{{ STAGES[stage + 1].rite }}</span> — held back. Complete a lesson, then try again.</p>
      <p v-else-if="pendingBlocked === 'passed'" class="mt-4 text-sm text-muted">One breakthrough a day — the next <span class="hanzi text-default">{{ STAGES[stage + 1].rite }}</span> awaits tomorrow.</p>
      <div v-else-if="toNext" class="mt-4">
        <div class="h-2.5 rounded-full bg-accented overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-(--accent)/30 transition-[width] duration-700" :style="`width:${toNext.ghost}%`" />
          <div class="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-700" :style="`width:${toNext.pct}%`" />
        </div>
        <p class="text-sm text-muted mt-2">
          <span class="tabular-nums text-default font-medium">{{ toNext.value }} / {{ toNext.target }}</span> HSK {{ toNext.band }} {{ toNext.metric === 'completed' ? 'units completed' : 'words known' }}
          → <span class="hanzi text-default">{{ toNext.realm }}{{ toNext.sub }}</span> <span class="text-default">{{ toNext.name }}</span>
        </p>
      </div>
      <p v-else class="text-sm text-muted mt-4">Every realm earned — read Readibu's HSK 4 shelf; real web novels are the next mountain.</p>

      <div class="flex items-center mt-4">
        <template v-for="(r, i) in REALMS" :key="r">
          <div v-if="i" class="flex-1 h-px" :class="i <= STAGES[stage].realm ? 'bg-(--accent)' : 'bg-accented'" />
          <div class="flex flex-col items-center gap-1" :title="r">
            <div class="size-3 rounded-full" :class="i < STAGES[stage].realm ? 'bg-(--accent)' : i === STAGES[stage].realm ? 'bg-(--accent) ring-4 ring-(--accent)/25' : i === STAGES[stage].realm + 1 ? 'border-2 border-(--accent)/60' : 'bg-accented'" />
            <span class="hanzi text-[10px] leading-none" :class="i === STAGES[stage].realm ? 'text-default' : 'text-muted'">{{ realmHanzi(r) }}</span>
          </div>
        </template>
      </div>
      <p class="text-xs text-muted mt-3">
        <RouterLink v-if="stage" :to="`/session/tribulation/${stage}`" class="underline">Retake the last <span class="hanzi">{{ STAGES[stage].rite }}</span></RouterLink><template v-if="stage"> for practice. </template>
        A word is <b>started</b> after its first lesson and <b>known</b> while you've remembered it for about three weeks and still would today — skip reviews and words fade out of known, and the rank with them. Readibu's graded stories open up around <span class="hanzi">筑基后期</span>; its xianxia shelf needs <span class="hanzi">元婴</span> plus the Donghua decks.</p>
      <div v-if="READ_AT[realmNow]" class="mt-3 flex items-center gap-3 rounded-xl bg-elevated p-3 text-sm">
        <UIcon :name="progress.marks[`read-${realmNow}`] ? 'i-lucide-check-circle-2' : 'i-lucide-book-open-text'" class="size-5 shrink-0" :class="progress.marks[`read-${realmNow}`] ? 'text-success' : 'text-(--accent)'" />
        <span class="flex-1">Read one chapter of {{ READ_AT[realmNow] }}, then come back.</span>
        <UButton v-if="!progress.marks[`read-${realmNow}`]" size="sm" color="neutral" variant="soft" @click="progress.marks[`read-${realmNow}`] = Date.now()">Done</UButton>
      </div>
    </UCard>

    <UCard v-if="path.length && toNext">
      <p class="text-xs text-muted uppercase tracking-wide">Path to <span class="hanzi normal-case">{{ toNext.realm }}{{ toNext.sub }}</span> <span class="normal-case">· {{ toNext.name }}</span></p>
      <p class="text-sm text-muted mt-1 mb-3">These theme lessons teach the words of the HSK units you still need. Do them first, then the units are a formality.</p>
      <div class="flex flex-col gap-1.5">
        <RouterLink v-for="p in path.slice(0, 8)" :key="p.unit.id" :to="`/session/learn/${p.unit.id}`" class="flex items-center gap-3 text-sm rounded-lg px-2 py-1.5" :class="p.done ? 'opacity-60' : 'bg-elevated'">
          <UIcon :name="p.done ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-4 shrink-0" :class="p.done ? 'text-success' : 'text-muted'" />
          <span class="flex-1 min-w-0 truncate">{{ p.unit.title }}</span>
          <span class="text-xs text-muted shrink-0">{{ p.shared }} words</span>
        </RouterLink>
      </div>
      <p v-if="path.length > 8" class="text-xs text-muted mt-2">+{{ path.length - 8 }} more in the Themes tab.</p>
    </UCard>

    <template v-if="knownCount">
      <p v-if="fading.length" class="text-sm text-muted px-1 -mt-2">
        Hold your rings:
        <template v-for="(f, i) in fading" :key="f.unit.id"><RouterLink :to="`/session/learn/${f.unit.id}`" class="text-default underline">{{ f.unit.title }}</RouterLink> ×{{ f.tier }}<template v-if="i < fading.length - 1"> · </template></template>
        — repeat today to keep it.
      </p>

      <UCard v-if="readable >= 10">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted uppercase tracking-wide">Read</p>
            <p class="text-lg font-semibold">{{ Math.min(READ_SIZE, readable) }} sentences you can understand</p>
            <p class="text-sm text-muted">No hearts, nothing graded — just read. <template v-if="retention7 !== null">Your 7-day true retention: {{ Math.round(retention7 * 100) }}%.</template></p>
          </div>
          <UButton icon="i-lucide-book-open-text" color="neutral" to="/session/read">Read</UButton>
        </div>
      </UCard>

      <UCard v-if="matureCount">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-muted uppercase tracking-wide"><span class="hanzi">试炼</span> weekly trial</p>
            <p v-if="trialDue" class="text-lg font-semibold">The {{ Math.min(20, trialWords().length) }} known words closest to fading</p>
            <p v-else-if="matureCount < TRIAL_MIN_WORDS" class="text-lg font-semibold">Opens at {{ TRIAL_MIN_WORDS }} known words</p>
            <p v-else class="text-lg font-semibold">Next trial in {{ trialDaysLeft }} day{{ trialDaysLeft === 1 ? '' : 's' }}</p>
            <p class="text-sm text-muted">Get them right and they stay known; miss and they drop out.</p>
          </div>
          <UButton v-if="trialDue" icon="i-lucide-shield-check" to="/session/trial">Take it</UButton>
        </div>
      </UCard>

      <UCard v-if="bandCompleted(1) >= 2">
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
        <div class="flex justify-between mb-1"><span>Spoken (donghua) coverage</span><span class="tabular-nums">{{ (coverage.known * 100).toFixed(1) }}% known · {{ (coverage.started * 100).toFixed(1) }}% started</span></div>
        <div class="h-1 rounded-full bg-accented overflow-hidden relative">
          <div class="absolute inset-y-0 left-0 bg-primary/30" :style="`width:${coverage.started * 100}%`" />
          <div class="absolute inset-y-0 left-0 bg-primary" :style="`width:${coverage.known * 100}%`" />
        </div>
      </div>
    </template>
  </div>
</template>
