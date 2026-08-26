<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Exercise } from '../types'
import { units } from '../data'
import { grade, dueIds, isKnown, knownCount, nextStage, stageValue, stageLabel, progress, completeLesson, lessonStrength, TIER_COLORS, recordChallenge, todaysChallenge } from '../store'
import { speak } from '../tts'
import { buildLearn, buildReview, buildChallenge } from '../session'
import { homophones, shuffle } from '../exercises'
import Intro from '../components/Intro.vue'
import Choice from '../components/Choice.vue'
import Tiles from '../components/Tiles.vue'
import Speak from '../components/Speak.vue'

const props = defineProps<{ mode: 'learn' | 'review' | 'challenge'; unit?: string }>()
const router = useRouter()

const queue = ref<Exercise[]>([])
const idx = ref(0)
const answered = ref<boolean | null>(null)
const graded = new Set<string>()
const misses = new Map<string, number>()
const stats = ref({ right: 0, wrong: 0 })
let completed = false
const finished = computed(() => idx.value >= queue.value.length)
const ex = computed(() => queue.value[idx.value])
const total = computed(() => queue.value.length)
const unitObj = computed(() => units.find((u) => u.id === props.unit))
const unitTitle = computed(() => unitObj.value?.title)
// HSK core lessons are strict: two lives, the third miss restarts the lesson — passing one means you actually know the words
const LIVES = 2
const strict = computed(() => props.mode === 'learn' && unitObj.value?.track === 'core')
const failed = computed(() => strict.value && stats.value.wrong > LIVES)
const knownBefore = ref(knownCount.value)
const attempt = ref(1)
const pinyinFirst = computed(() => progress.settings.focus === 'pinyin')
const text = (e: Exercise) => (e.sentence ? e.sentence.hanzi : e.word.hanzi)
const pinyinOf = (e: Exercise) => (e.sentence ? e.sentence.pinyin : e.word.pinyin)
const meaningOf = (e: Exercise) => (e.sentence ? e.sentence.meaning : e.word.meaning)
// options never contrast homophones (nothing in the question would tell 他 from 她), so the answer names them
const twins = computed(() => (ex.value && !ex.value.sentence ? homophones(ex.value.word, isKnown, 2) : []))

function start() {
  queue.value = props.mode === 'learn' && props.unit ? buildLearn(props.unit) : props.mode === 'challenge' ? buildChallenge() : buildReview()
  knownBefore.value = knownCount.value
  completed = false
  idx.value = 0
  answered.value = null
  graded.clear()
  misses.clear()
  stats.value = { right: 0, wrong: 0 }
}
start()
watch(() => [props.mode, props.unit], start)

function onAnswer(correct: boolean) {
  answered.value = correct
  const e = ex.value
  const isSentence = !!e.sentence
  if (props.mode === 'challenge') {
    correct ? stats.value.right++ : stats.value.wrong++
    return // a test, not practice: no scheduling, no retries
  }
  if (!isSentence && !graded.has(e.word.id)) {
    graded.add(e.word.id)
    grade(e.word.id, correct)
  }
  correct ? stats.value.right++ : stats.value.wrong++
  if (!correct && strict.value && stats.value.wrong > LIVES) return // out of lives → footer offers Restart
  if (!correct) {
    // missed → the same question goes to the back of the pile (options reshuffled), up to three times;
    // the intro card comes back before the third try
    const key = e.sentence?.hanzi ?? e.word.id
    const n = (misses.get(key) ?? 0) + 1
    misses.set(key, n)
    if (n <= 3) {
      if (n === 2 && !isSentence) queue.value.push({ kind: 'intro', word: e.word, options: [], tiles: [] })
      queue.value.push({ ...e, options: shuffle(e.options), tiles: shuffle(e.tiles) })
    }
  }
  if (!e.kind.startsWith('audio')) speak(text(e), 0.85, true)
}
function restart() {
  attempt.value++
  start()
}
function next() {
  answered.value = null
  idx.value++
  if (idx.value >= queue.value.length && !completed) {
    completed = true
    if (props.mode === 'learn' && props.unit) completeLesson(props.unit)
    if (props.mode === 'challenge') recordChallenge(stats.value.right)
  }
}
const strength = computed(() => (props.unit ? lessonStrength(props.unit) : null))
const attempts = computed(() => todaysChallenge().attempts)
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && answered.value !== null) failed.value ? restart() : next()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

watch(ex, (e) => {
  if (e?.kind.startsWith('audio')) setTimeout(() => speak(e.word.hanzi, 0.85, true), 150)
})

const prompt: Record<string, string> = {
  meaning: 'What does this mean?',
  hanzi: 'Pick the character(s)',
  audio: 'What did you hear?',
  pinyin: 'Pick the pinyin (watch the tones)',
  audioMeaning: 'What does it mean?',
  pinyinMeaning: 'What does this mean?',
  meaningPinyin: 'Pick the pinyin',
  audioPinyin: 'Which pinyin did you hear? (tones!)',
  tiles: 'Build the word',
  sentence: 'Build the sentence',
  sentenceMeaning: 'What does this sentence mean?',
}
const optionsAreHanzi = (k: string) => k === 'hanzi' || k === 'audio'
const optionsArePinyin = (k: string) => k === 'pinyin' || k === 'meaningPinyin' || k === 'audioPinyin'
</script>

<template>
  <div class="flex flex-col flex-1 py-4 gap-4">
    <header class="flex items-center gap-3">
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="size-11 justify-center" aria-label="Quit" @click="router.push(mode === 'review' ? '/' : '/learn')" />
      <UProgress :model-value="Math.min(idx, total)" :max="total || 1" size="lg" class="flex-1" />
      <span class="text-sm text-muted tabular-nums">{{ Math.min(idx, total) }}/{{ total }}</span>
      <span v-if="strict && !finished" class="flex items-center gap-0.5" :title="`${Math.max(0, LIVES - stats.wrong)} of ${LIVES} lives left`">
        <UIcon v-for="i in LIVES" :key="i" name="i-lucide-heart" class="size-4" :class="i <= LIVES - stats.wrong ? 'text-error' : 'text-muted/40'" />
      </span>
      <UBadge v-if="strict && attempt > 1" color="neutral" variant="subtle" size="sm">try {{ attempt }}</UBadge>
    </header>

    <template v-if="finished">
      <div class="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <UIcon name="i-lucide-party-popper" class="size-16 text-primary" />
        <h1 class="text-3xl font-bold">{{ mode === 'learn' ? 'Unit done' : mode === 'challenge' ? `${stats.right} / ${total}` : 'Review done' }}</h1>
        <p class="text-muted">{{ stats.right }} correct · {{ stats.wrong }} missed</p>
        <div v-if="mode === 'challenge'" class="w-full max-w-xs rounded-xl bg-elevated p-3 text-sm">
          <p class="font-medium mb-2">Today's attempts</p>
          <div class="flex items-end gap-1 h-16">
            <div v-for="(a, i) in attempts" :key="i" class="flex-1 rounded-t flex flex-col justify-end items-center" :title="`${a}/${total}`">
              <span class="text-xs tabular-nums">{{ a }}</span>
              <div class="w-full rounded-t" :class="i === attempts.length - 1 ? 'bg-primary' : 'bg-primary/40'" :style="`height:${Math.max(4, (a / total) * 48)}px`" />
            </div>
          </div>
          <p class="text-muted mt-2">
            <template v-if="attempts.length > 1">{{ stats.right - attempts[0] >= 0 ? '+' : '' }}{{ stats.right - attempts[0] }} since your first try today.</template>
            <template v-else>Do today's lesson, then come back — you should beat this.</template>
          </p>
        </div>
        <div v-if="strength && mode === 'learn'" class="w-full max-w-xs rounded-xl bg-elevated p-3 text-sm">
          <div class="flex justify-between mb-1">
            <span>Lesson strength</span>
            <span class="tabular-nums font-medium">{{ Math.round(strength.strength) }}% <span v-if="strength.tier" class="text-muted">· tier {{ strength.tier }}</span></span>
          </div>
          <div class="h-2 rounded-full overflow-hidden" :style="`background:${strength.tier ? TIER_COLORS[(strength.tier - 1) % TIER_COLORS.length] : 'var(--ui-bg-accented)'}`">
            <div class="h-full" :style="`width:${strength.strength % 100}%;background:${TIER_COLORS[strength.tier % TIER_COLORS.length]}`" />
          </div>
          <p class="text-muted mt-1">
            <template v-if="strength.completions === 1">First time through! Repeat tomorrow to keep it strong.</template>
            <template v-else>Done {{ strength.completions }}×. {{ strength.toNext }} more for ×{{ strength.tier + 1 }}; fades {{ strength.loss }}% a day.</template>
          </p>
        </div>
        <p v-if="mode === 'learn' && nextStage" class="text-sm text-muted -mt-3">
          <span v-if="knownCount > knownBefore" class="text-primary font-medium">+{{ knownCount - knownBefore }} words started</span>
          <span v-if="knownCount > knownBefore"> · </span>{{ nextStage.target - stageValue(nextStage) }} more HSK {{ nextStage.band }} words {{ nextStage.metric }} to <span class="hanzi">{{ stageLabel(nextStage).realm }}{{ stageLabel(nextStage).sub }}</span>
        </p>
        <div class="flex flex-col gap-2 w-full max-w-xs">
          <UButton v-if="dueIds.length" size="xl" block @click="router.replace('/session/review'); start()">
            Review {{ dueIds.length }} due
          </UButton>
          <UButton v-if="(mode === 'learn' && unit) || mode === 'challenge'" size="xl" block color="neutral" variant="soft" icon="i-lucide-repeat" @click="start()">{{ mode === 'challenge' ? 'Try again' : 'Do it again' }}</UButton>
          <UButton size="xl" block color="neutral" variant="soft" to="/learn">Learn more</UButton>
          <UButton size="xl" block color="neutral" variant="ghost" to="/">Home</UButton>
        </div>
      </div>
    </template>

    <template v-else-if="ex">
      <p v-if="unitTitle && mode === 'learn'" class="text-xs text-muted -mb-2">{{ unitTitle }}<span v-if="strict"> · strict: {{ LIVES }} lives, the third miss restarts</span></p>
      <p v-else-if="mode === 'challenge'" class="text-xs text-muted -mb-2">Daily challenge — a test, not practice: no hints, no retries</p>
      <Intro v-if="ex.kind === 'intro'" :key="idx" :word="ex.word" class="flex-1" @done="next" />

      <div v-else :key="idx" class="flex-1 flex flex-col gap-6">
        <h2 class="text-lg font-semibold text-muted">{{ prompt[ex.kind] }}</h2>

        <div class="flex flex-col items-center gap-3 text-center min-h-28 justify-center">
          <!-- prompt: hanzi -->
          <template v-if="ex.kind === 'meaning' || ex.kind === 'pinyin'">
            <button class="hanzi text-6xl sm:text-7xl" @click="speak(ex.word.hanzi)">{{ ex.word.hanzi }}</button>
            <p v-if="ex.kind === 'meaning' && pinyinFirst" class="text-primary text-xl">{{ ex.word.pinyin }}</p>
            <Speak v-if="ex.kind === 'meaning'" :text="ex.word.hanzi" size="sm" />
          </template>
          <!-- prompt: pinyin -->
          <template v-else-if="ex.kind === 'pinyinMeaning'">
            <button class="text-5xl font-semibold text-primary" @click="speak(ex.word.hanzi)">{{ ex.word.pinyin }}</button>
            <p class="hanzi text-3xl text-muted">{{ ex.word.hanzi }}</p>
            <Speak :text="ex.word.hanzi" size="sm" />
          </template>
          <!-- prompt: meaning -->
          <template v-else-if="ex.kind === 'hanzi' || ex.kind === 'meaningPinyin' || ex.kind === 'tiles'">
            <p class="text-2xl font-medium">{{ ex.word.meaning }}</p>
            <p v-if="ex.kind === 'tiles'" class="text-primary text-lg">{{ ex.word.pinyin }}</p>
            <Speak v-if="ex.kind === 'tiles'" :text="ex.word.hanzi" size="sm" />
          </template>
          <!-- prompt: audio -->
          <template v-else-if="ex.kind.startsWith('audio')">
            <UButton icon="i-lucide-volume-2" size="xl" class="rounded-full size-24 justify-center [&>span]:size-12" @click="speak(ex.word.hanzi)" />
            <UButton size="xs" color="neutral" variant="link" @click="speak(ex.word.hanzi, 0.6)">Play slowly</UButton>
          </template>
          <!-- prompt: sentence -->
          <template v-else-if="ex.kind === 'sentence'">
            <p class="text-2xl font-medium">{{ ex.sentence!.meaning }}</p>
            <Speak :text="ex.sentence!.hanzi" size="sm" />
          </template>
          <template v-else-if="ex.kind === 'sentenceMeaning'">
            <p v-if="pinyinFirst" class="text-primary text-2xl">{{ ex.sentence!.pinyin }}</p>
            <p class="hanzi" :class="pinyinFirst ? 'text-2xl text-muted' : 'text-4xl'">{{ ex.sentence!.hanzi }}</p>
            <Speak :text="ex.sentence!.hanzi" size="sm" />
          </template>
        </div>

        <Choice
          v-if="ex.kind === 'meaning' || ex.kind === 'audioMeaning' || ex.kind === 'pinyinMeaning'"
          :options="ex.options" :correct="ex.word.meaning" @answer="onAnswer"
        />
        <Choice v-else-if="optionsAreHanzi(ex.kind)" :options="ex.options" :correct="ex.word.hanzi" hanzi @answer="onAnswer" />
        <Choice v-else-if="optionsArePinyin(ex.kind)" :options="ex.options" :correct="ex.word.pinyin" pinyin @answer="onAnswer" />
        <Tiles v-else-if="ex.kind === 'tiles'" :tiles="ex.tiles" :answer="[...ex.word.hanzi]" @answer="onAnswer" />
        <Tiles v-else-if="ex.kind === 'sentence'" :tiles="ex.tiles" :answer="ex.sentence!.tokens" :pinyin="pinyinFirst" @answer="onAnswer" />
        <Choice v-else-if="ex.kind === 'sentenceMeaning'" :options="ex.options" :correct="ex.sentence!.meaning" @answer="onAnswer" />
      </div>

      <footer
        v-if="answered !== null"
        class="rounded-2xl p-4 flex flex-col gap-3 sticky bottom-[env(safe-area-inset-bottom)]"
        :class="answered ? 'bg-success/15' : 'bg-error/15'"
      >
        <div class="flex items-center gap-3">
          <UIcon :name="answered ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'" class="size-8 shrink-0" :class="answered ? 'text-success' : 'text-error'" />
          <div class="flex-1 min-w-0">
            <p class="text-primary text-lg">{{ pinyinOf(ex) }} <span class="hanzi text-default text-xl ml-2">{{ text(ex) }}</span></p>
            <p class="text-sm text-muted line-clamp-2">{{ meaningOf(ex) }}</p>
            <p v-if="twins.length" class="text-xs text-muted mt-1">
              Sounds the same:
              <span v-for="(t, i) in twins" :key="t.id"><span class="hanzi text-default">{{ t.hanzi }}</span> {{ t.meaning }}{{ i < twins.length - 1 ? ' · ' : '' }}</span>
            </p>
            <p v-for="w in ex.newWords" :key="w.id" class="text-sm mt-1">
              <UBadge color="primary" variant="subtle" size="sm" class="mr-1">new</UBadge>
              <span class="text-primary">{{ w.pinyin }}</span> <span class="hanzi">{{ w.hanzi }}</span> <span class="text-muted">— {{ w.meaning }}</span>
            </p>
          </div>
          <Speak :text="text(ex)" size="sm" />
        </div>
        <UButton v-if="failed" size="xl" block color="error" icon="i-lucide-rotate-ccw" @click="restart">Out of lives — restart lesson</UButton>
        <UButton v-else size="xl" block :color="answered ? 'success' : 'error'" @click="next">Continue</UButton>
      </footer>
    </template>
  </div>
</template>
