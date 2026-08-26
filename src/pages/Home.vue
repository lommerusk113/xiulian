<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../data'
import { challengeHistory, todaysChallenge, CHALLENGE_SIZE, progress, dueIds, knownCount, matureCount, nextUnit, streak, rank, nextBand, bandStats, coverage, REALMS, TIER_COLORS } from '../store'

const coreTotal = words.filter((w) => w.level > 0).length
const readibu = computed(() => Math.round((matureCount.value / coreTotal) * 100))
const challenge = computed(() => todaysChallenge())
const best = computed(() => (challenge.value.attempts.length ? Math.max(...challenge.value.attempts) : null))
const history = computed(() => challengeHistory())
const hour = new Date().getHours()
const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

// realm hero: the current realm in its tier colour, nine 层 layers toward the next one
const realm = (r: number) => ({ hanzi: REALMS[r].split(' ')[0], name: REALMS[r].split(' ').slice(1).join(' ') })
const accent = computed(() => TIER_COLORS[rank.value % TIER_COLORS.length])
const LAYERS = 9
const layer = computed(() => (nextBand.value ? Math.min(LAYERS - 1, Math.floor((nextBand.value.known / nextBand.value.need) * LAYERS)) : LAYERS))
const layerFill = (i: number) => {
  const b = nextBand.value
  if (!b) return { known: 100, started: 100 }
  const pct = (v: number) => Math.max(0, Math.min(100, ((v / b.need) * LAYERS - i) * 100))
  return { known: pct(b.known), started: pct(b.started) }
}
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
          <p class="hanzi text-5xl font-bold leading-none text-(--accent)">{{ realm(rank).hanzi }}</p>
          <p class="font-semibold mt-1">{{ realm(rank).name }} <span class="text-muted font-normal text-sm">· HSK rank {{ rank }}</span></p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-2xl font-bold tabular-nums flex items-center justify-end gap-1"><UIcon name="i-lucide-flame" :class="streak ? 'text-(--accent)' : 'text-muted'" />{{ streak }}</p>
          <p class="text-xs text-muted">day streak</p>
          <UBadge v-if="today" color="primary" variant="subtle" size="sm" class="mt-1 animate-pulse">{{ today }} words met today</UBadge>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex gap-1">
          <div v-for="i in LAYERS" :key="i" class="flex-1 h-2.5 rounded-full bg-accented overflow-hidden relative">
            <div class="absolute inset-y-0 left-0 bg-(--accent)/30 transition-[width] duration-700" :style="`width:${layerFill(i - 1).started}%`" />
            <div class="absolute inset-y-0 left-0 bg-(--accent) transition-[width] duration-700" :style="`width:${layerFill(i - 1).known}%`" />
          </div>
        </div>
        <p v-if="nextBand" class="text-sm text-muted mt-2">
          <span class="hanzi text-default font-medium">第{{ '一二三四五六七八九'[layer] }}层</span>
          · {{ nextBand.known }} / {{ nextBand.need }} known · {{ nextBand.started }} started → <span class="hanzi">{{ realm(nextBand.level).hanzi }}</span>
        </p>
        <p v-else class="text-sm text-muted mt-2">All four realms earned — go read.</p>
      </div>

      <div class="flex items-center mt-4">
        <template v-for="(r, i) in REALMS" :key="r">
          <div v-if="i" class="flex-1 h-px" :class="i <= rank ? 'bg-(--accent)' : 'bg-accented'" />
          <div class="flex flex-col items-center gap-1" :title="r">
            <div class="size-3 rounded-full" :class="i < rank ? 'bg-(--accent)' : i === rank ? 'bg-(--accent) ring-4 ring-(--accent)/25' : i === rank + 1 ? 'border-2 border-(--accent)/60' : 'bg-accented'" />
            <span class="hanzi text-[10px] leading-none" :class="i === rank ? 'text-default' : 'text-muted'">{{ realm(i).hanzi }}</span>
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
