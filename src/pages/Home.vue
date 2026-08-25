<script setup lang="ts">
import { computed } from 'vue'
import { words } from '../data'
import { challengeHistory, todaysChallenge, CHALLENGE_SIZE, progress, dueIds, knownCount, matureCount, nextUnit, streak, unitLearned, rank, nextBand, bandStats, coverage, KNOWN_DAYS, REALMS } from '../store'

const coreTotal = words.filter((w) => w.level > 0).length
const readibu = computed(() => Math.round((matureCount.value / coreTotal) * 100))
const challenge = computed(() => todaysChallenge())
const best = computed(() => (challenge.value.attempts.length ? Math.max(...challenge.value.attempts) : null))
const history = computed(() => challengeHistory())
const hour = new Date().getHours()
const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div>
      <p class="hanzi text-4xl font-bold">{{ greeting }}</p>
      <p class="text-muted">{{ hour < 12 ? 'zǎoshang hǎo' : hour < 18 ? 'xiàwǔ hǎo' : 'wǎnshang hǎo' }} — good {{ hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening' }}</p>
    </div>

    <UCard v-if="dueIds.length" class="ring-primary/40">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <p class="text-3xl font-bold">{{ dueIds.length }}</p>
          <p class="text-muted text-sm">words due for review</p>
        </div>
        <UButton size="xl" icon="i-lucide-brain" to="/session/review">Review</UButton>
      </div>
    </UCard>

    <div class="flex items-center justify-between rounded-xl border border-default px-4 py-2 text-sm">
      <span class="flex items-center gap-2"><UIcon :name="progress.settings.quiet ? 'i-lucide-volume-x' : 'i-lucide-volume-2'" /> Quiet mode <span class="text-muted hidden sm:inline">— no listening exercises, no autoplay</span></span>
      <USwitch v-model="progress.settings.quiet" />
    </div>

    <UCard v-if="!knownCount && !progress.settings.quiet">
      <div class="flex items-center gap-4">
        <UIcon name="i-lucide-ear" class="size-10 text-primary shrink-0" />
        <div class="flex-1">
          <p class="font-semibold">Got headphones? Try Sounds &amp; tones</p>
          <p class="text-sm text-muted">Optional 10-minute primer on tones and tricky initials. Lessons work fine without it.</p>
        </div>
        <UButton color="neutral" to="/sounds">Open</UButton>
      </div>
    </UCard>

    <UCard>
      <div class="flex items-center gap-4">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-muted uppercase tracking-wide">Daily challenge</p>
          <p class="text-xl font-semibold">
            <template v-if="best === null">Not attempted yet</template>
            <template v-else>Best {{ best }} / {{ CHALLENGE_SIZE }} <span class="text-muted text-sm font-normal">· {{ challenge.attempts.length }} tr{{ challenge.attempts.length === 1 ? 'y' : 'ies' }}</span></template>
          </p>
          <p class="text-sm text-muted">Mostly tomorrow's words. Try it now, do the lesson, try again — the gap is what you learned.</p>
        </div>
        <UButton size="xl" icon="i-lucide-swords" color="neutral" to="/session/challenge">{{ best === null ? 'Take it' : 'Again' }}</UButton>
      </div>
      <div class="flex items-end gap-1.5 h-12 mt-4">
        <div v-for="(d, i) in history" :key="i" class="flex-1 flex flex-col items-center justify-end gap-1" :title="d.best === null ? 'no attempt' : `${d.best}/${CHALLENGE_SIZE}`">
          <div class="w-full rounded-t" :class="d.best === null ? 'bg-accented' : i === history.length - 1 ? 'bg-primary' : 'bg-primary/50'" :style="`height:${d.best === null ? 3 : Math.max(4, (d.best / CHALLENGE_SIZE) * 32)}px`" />
          <span class="text-[10px] text-muted">{{ d.day }}</span>
        </div>
      </div>
    </UCard>

    <UCard v-if="nextUnit">
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <p class="text-xs text-muted uppercase tracking-wide">Up next</p>
          <p class="text-xl font-semibold">{{ nextUnit.title }}</p>
          <p class="hanzi text-muted text-sm truncate">{{ nextUnit.wordIds.join('  ') }}</p>
        </div>
        <UButton size="xl" icon="i-lucide-play" color="neutral" :to="`/session/learn/${nextUnit.id}`">
          {{ unitLearned(nextUnit.id) ? 'Continue' : 'Learn' }}
        </UButton>
      </div>
    </UCard>

    <div class="grid grid-cols-3 gap-3">
      <UCard v-for="s in [[knownCount, 'words started'], [matureCount, 'words mature'], [streak, 'day streak']] as const" :key="s[1]">
        <p class="text-2xl font-bold tabular-nums">{{ s[0] }}</p>
        <p class="text-xs text-muted">{{ s[1] }}</p>
      </UCard>
    </div>

    <UCard>
      <div class="flex items-center gap-4 mb-4">
        <div class="size-16 shrink-0 rounded-2xl bg-primary/15 text-primary grid place-items-center">
          <span class="text-xs uppercase leading-none">HSK</span>
          <span class="text-3xl font-black leading-none">{{ rank }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold">{{ rank ? `HSK ${rank} rank earned` : 'No rank yet' }} <span class="hanzi text-muted font-normal">· {{ REALMS[rank] }}</span></p>
          <p v-if="nextBand" class="text-sm text-muted">
            Next: HSK {{ nextBand.level }} · step {{ Math.min(Math.floor(nextBand.known / 100) + 1, Math.ceil(nextBand.need / 100)) }}/{{ Math.ceil(nextBand.need / 100) }}
            — {{ nextBand.known }} / {{ nextBand.need }} words known
          </p>
          <p v-else class="text-sm text-muted">All four bands earned — go read.</p>
        </div>
      </div>
      <UProgress v-if="nextBand" :model-value="nextBand.known" :max="nextBand.need" />
      <p class="text-xs text-muted mt-2">
        A word is <b>known</b> once the scheduler expects you to remember it for {{ KNOWN_DAYS }}+ days. Known words still come up — just rarely.
        Started: {{ knownCount }} · Known: {{ matureCount }}
      </p>
    </UCard>

    <UCard>
      <div class="flex justify-between text-sm mb-2">
        <span class="font-medium">Subtitle coverage</span>
        <span class="text-muted tabular-nums">{{ (coverage.started * 100).toFixed(1) }}% started · {{ (coverage.known * 100).toFixed(1) }}% known</span>
      </div>
      <div class="h-2 rounded-full bg-accented overflow-hidden relative">
        <div class="absolute inset-y-0 left-0 bg-primary/30" :style="`width:${coverage.started * 100}%`" />
        <div class="absolute inset-y-0 left-0 bg-primary" :style="`width:${coverage.known * 100}%`" />
      </div>
      <p class="text-xs text-muted mt-2">Share of all words spoken in film &amp; TV subtitles (OpenSubtitles zh) that you've met. HSK 1–4 together cover about 66%.</p>
    </UCard>

    <UCard>
      <p class="font-medium text-sm mb-3">Road to Readibu</p>
      <div class="flex flex-col gap-3">
        <div v-for="b in bandStats" :key="b.level" class="flex items-center gap-3 text-sm">
          <span class="w-12 text-muted">HSK {{ b.level }}</span>
          <div class="flex-1 h-2 rounded-full bg-accented overflow-hidden relative">
            <div class="absolute inset-y-0 left-0 bg-primary/30" :style="`width:${(b.started / b.total) * 100}%`" />
            <div class="absolute inset-y-0 left-0 bg-primary" :style="`width:${(b.known / b.total) * 100}%`" />
          </div>
          <span class="w-24 text-right tabular-nums text-muted">{{ b.known }} / {{ b.total }}</span>
        </div>
      </div>
      <p class="text-xs text-muted mt-3">
        Learners report Readibu's easiest stories become readable around HSK 3–4 (~{{ coreTotal.toLocaleString() }} words); donghua with Chinese subtitles gets comfortable earlier if you add the media track.
        Overall: {{ readibu }}% known.
      </p>
    </UCard>
  </div>
</template>
