<script setup lang="ts">
import { ref } from 'vue'
import { speak } from '../tts'

// Minimal sets: same syllable, four tones (+ neutral). Real characters so TTS pronounces them correctly.
const SETS = [
  { syl: 'ma', chars: ['妈', '麻', '马', '骂'], glosses: ['mom', 'hemp', 'horse', 'to scold'], neutral: { char: '吗', gloss: '(question)' } },
  { syl: 'ba', chars: ['八', '拔', '把', '爸'], glosses: ['eight', 'to pull', 'to hold', 'dad'] },
  { syl: 'tang', chars: ['汤', '糖', '躺', '烫'], glosses: ['soup', 'sugar', 'to lie down', 'scalding'] },
  { syl: 'shu', chars: ['书', '熟', '数', '树'], glosses: ['book', 'ripe', 'to count', 'tree'] },
  { syl: 'xi', chars: ['西', '习', '洗', '系'], glosses: ['west', 'to practise', 'to wash', 'system'] },
  { syl: 'yu', chars: ['迂', '鱼', '雨', '玉'], glosses: ['roundabout', 'fish', 'rain', 'jade'] },
]
const MARKS = ['ā', 'á', 'ǎ', 'à']
const TONES = [
  { n: 1, name: 'high & flat', hint: 'like singing one steady note', shape: 'M4 18 L44 18' },
  { n: 2, name: 'rising', hint: 'like asking "huh?"', shape: 'M4 30 L44 8' },
  { n: 3, name: 'dip', hint: 'falls low, then comes up a bit', shape: 'M4 20 L24 34 L44 16' },
  { n: 4, name: 'falling', hint: 'sharp, like a firm "No!"', shape: 'M4 6 L44 34' },
]
const INITIALS = [
  { group: 'b · p', note: 'no voice buzz on b; p has a puff of air', words: ['八 bā', '怕 pà'] },
  { group: 'd · t', note: 'same idea: t is the puffy one', words: ['大 dà', '他 tā'] },
  { group: 'z · c · s', note: 'z ≈ "ds", c ≈ "ts", tongue behind the teeth', words: ['在 zài', '菜 cài', '三 sān'] },
  { group: 'zh · ch · sh · r', note: 'tongue curled back; r is a buzzy "zh"', words: ['这 zhè', '吃 chī', '是 shì', '人 rén'] },
  { group: 'j · q · x', note: 'like "jee / chee / shee" with the tongue flat and forward', words: ['家 jiā', '去 qù', '西 xī'] },
  { group: 'ü (written u after j/q/x/y)', note: 'say "ee" and round your lips', words: ['女 nǚ', '去 qù', '鱼 yú'] },
]

// tone drill: hear a character, pick its tone
const quiz = ref<{ set: (typeof SETS)[number]; i: number } | null>(null)
const picked = ref<number | null>(null)
const score = ref({ right: 0, total: 0 })
function nextQuiz() {
  const set = SETS[Math.floor(Math.random() * SETS.length)]
  quiz.value = { set, i: Math.floor(Math.random() * 4) }
  picked.value = null
  setTimeout(() => speak(set.chars[quiz.value!.i]), 100)
}
function pick(i: number) {
  if (picked.value !== null) return
  picked.value = i
  score.value.total++
  if (i === quiz.value!.i) score.value.right++
}
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <div>
      <h1 class="text-2xl font-bold">Sounds &amp; tones</h1>
      <p class="text-muted">Mandarin has four tones (plus a light neutral one). Same syllable, different tone, different word. Tap anything to hear it.</p>
    </div>

    <UCard>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button v-for="t in TONES" :key="t.n" class="rounded-xl bg-elevated p-3 text-left hover:ring ring-primary/40" @click="speak(SETS[0].chars[t.n - 1])">
          <svg viewBox="0 0 48 40" class="w-full h-10 stroke-primary fill-none" stroke-width="4" stroke-linecap="round"><path :d="t.shape" /></svg>
          <p class="font-semibold mt-1">Tone {{ t.n }} <span class="text-primary text-lg ml-1">m{{ MARKS[t.n - 1] }}</span></p>
          <p class="text-xs text-muted">{{ t.name }} — {{ t.hint }}</p>
        </button>
      </div>
      <p class="text-xs text-muted mt-3">The mark sits on the vowel and draws the pitch: ā flat, á rising, ǎ dipping, à falling. No mark (ma) = neutral, short and light.</p>
    </UCard>

    <section class="flex flex-col gap-3">
      <h2 class="font-semibold">Same syllable, four words</h2>
      <UCard v-for="s in SETS" :key="s.syl">
        <div class="grid grid-cols-4 gap-2 text-center" :class="s.neutral && 'sm:grid-cols-5'">
          <button v-for="(c, i) in s.chars" :key="c" class="rounded-lg bg-elevated py-2 hover:ring ring-primary/40" @click="speak(c)">
            <p class="text-primary font-semibold">{{ s.syl.replace(/a|e|o|i|u/, (v) => ({ a: 'āáǎà', e: 'ēéěè', o: 'ōóǒò', i: 'īíǐì', u: 'ūúǔù' })[v]![i]) }}</p>
            <p class="hanzi text-2xl">{{ c }}</p>
            <p class="text-xs text-muted">{{ s.glosses[i] }}</p>
          </button>
          <button v-if="s.neutral" class="rounded-lg bg-elevated py-2 hover:ring ring-primary/40 col-span-4 sm:col-span-1" @click="speak(s.neutral.char)">
            <p class="text-primary font-semibold">{{ s.syl }}</p>
            <p class="hanzi text-2xl">{{ s.neutral.char }}</p>
            <p class="text-xs text-muted">{{ s.neutral.gloss }}</p>
          </button>
        </div>
      </UCard>
    </section>

    <UCard>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold">Tone drill</h2>
        <span class="text-sm text-muted tabular-nums">{{ score.right }} / {{ score.total }}</span>
      </div>
      <div v-if="!quiz" class="text-center">
        <UButton size="lg" icon="i-lucide-play" @click="nextQuiz">Start</UButton>
      </div>
      <div v-else class="flex flex-col items-center gap-4">
        <UButton icon="i-lucide-volume-2" size="xl" class="rounded-full size-20 justify-center [&>span]:size-10" @click="speak(quiz.set.chars[quiz.i])" />
        <div class="grid grid-cols-4 gap-2 w-full">
          <button
            v-for="(m, i) in MARKS" :key="m"
            class="rounded-xl border-2 py-3 text-2xl font-semibold"
            :class="picked === null ? 'border-default bg-elevated hover:border-primary' : i === quiz.i ? 'border-success text-success' : i === picked ? 'border-error text-error' : 'border-default opacity-50'"
            @click="pick(i)"
          >{{ quiz.set.syl.replace(/a|e|o|i|u/, (v) => ({ a: 'āáǎà', e: 'ēéěè', o: 'ōóǒò', i: 'īíǐì', u: 'ūúǔù' })[v]![i]) }}</button>
        </div>
        <div v-if="picked !== null" class="text-center">
          <p class="hanzi text-3xl">{{ quiz.set.chars[quiz.i] }} <span class="text-muted text-base">{{ quiz.set.glosses[quiz.i] }}</span></p>
          <UButton class="mt-3" @click="nextQuiz">Next</UButton>
        </div>
      </div>
    </UCard>

    <section class="flex flex-col gap-3">
      <h2 class="font-semibold">Tricky initials</h2>
      <UCard v-for="g in INITIALS" :key="g.group">
        <p class="font-medium">{{ g.group }}</p>
        <p class="text-sm text-muted mb-2">{{ g.note }}</p>
        <div class="flex flex-wrap gap-2">
          <UButton v-for="w in g.words" :key="w" color="neutral" variant="soft" class="hanzi" @click="speak(w.split(' ')[0])">{{ w }}</UButton>
        </div>
      </UCard>
    </section>
  </div>
</template>
