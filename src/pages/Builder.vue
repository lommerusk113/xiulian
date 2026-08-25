<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Word } from '../types'
import { words } from '../data'
import { isKnown, progress } from '../store'
import { speak } from '../tts'
import { check } from '../grammar'
import Speak from '../components/Speak.vue'

const QUESTION = new Set(['谁', '什么', '哪', '哪儿', '哪里', '怎么', '怎么样', '为什么', '多少', '几', '吗', '呢'])
const GREETINGS = new Set(['你好', '谢谢', '不客气', '对不起', '没关系', '再见'])
const CATEGORIES: { name: string; test: (w: Word) => boolean }[] = [
  { name: 'Greetings', test: (w) => GREETINGS.has(w.hanzi) },
  { name: 'Pronouns', test: (w) => w.pos === 'r' && !QUESTION.has(w.hanzi) },
  { name: 'Question words', test: (w) => QUESTION.has(w.hanzi) },
  { name: 'Verbs', test: (w) => !!w.pos && /^v/.test(w.pos) },
  { name: 'Adjectives', test: (w) => !!w.pos && /^a/.test(w.pos) },
  { name: 'Nouns', test: (w) => !!w.pos && /^n/.test(w.pos) },
  { name: 'Numbers & measure words', test: (w) => !!w.pos && /^[mq]/.test(w.pos) },
  { name: 'Time & place', test: (w) => !!w.pos && /^(t|f|s)/.test(w.pos) },
  { name: 'Adverbs', test: (w) => !!w.pos && /^d/.test(w.pos) },
  { name: 'Particles', test: (w) => !!w.pos && /^[uyk]/.test(w.pos) },
  { name: 'Prepositions & conjunctions', test: (w) => !!w.pos && /^[pc]/.test(w.pos) },
  { name: 'Phrases', test: (w) => !w.pos || w.pos === 'l' },
]
const source = ref<'mine' | 'hsk1' | 'hsk12'>('mine')
const sources = [
  { label: 'My words', value: 'mine' },
  { label: 'HSK 1', value: 'hsk1' },
  { label: 'HSK 1–2', value: 'hsk12' },
]
const bank = computed(() => {
  const list = words.filter((w) => w.level > 0 && (source.value === 'mine' ? isKnown(w.id) : source.value === 'hsk1' ? w.level === 1 : w.level <= 2))
  const used = new Set<string>()
  return CATEGORIES.map((c) => ({ name: c.name, words: list.filter((w) => !used.has(w.id) && c.test(w) && used.add(w.id)) })).filter((c) => c.words.length)
})
const open = ref<string | null>(null)
const built = ref<Word[]>([])
const pinyinFirst = computed(() => progress.settings.focus === 'pinyin')
const punct = computed(() => (built.value.some((w) => QUESTION.has(w.hanzi)) ? '？' : built.value.length ? '。' : ''))
const hanzi = computed(() => built.value.map((w) => w.hanzi).join('') + punct.value)
const pinyin = computed(() => built.value.map((w) => w.pinyin).join(' '))
const result = ref<ReturnType<typeof check> | null>(null)

function add(w: Word) {
  built.value.push(w)
  result.value = null
}
function remove(i: number) {
  built.value.splice(i, 1)
  result.value = null
}
function validate() {
  result.value = check(built.value)
  speak(hanzi.value)
}
</script>

<template>
  <div class="flex flex-col gap-4 py-6">
    <div>
      <h1 class="text-2xl font-bold">Sentence builder</h1>
      <p class="text-muted text-sm">Tap words to build a sentence, then check it. Chinese word order is mostly Subject · Time · Adverb · Verb · Object.</p>
    </div>

    <UCard class="sticky top-0 z-10">
      <div class="min-h-16 flex flex-wrap gap-2 items-end">
        <button
          v-for="(w, i) in built" :key="i"
          class="px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/40 flex flex-col items-center leading-tight"
          @click="remove(i)"
        >
          <span :class="pinyinFirst ? 'text-primary font-medium' : 'hanzi text-xl'">{{ pinyinFirst ? w.pinyin : w.hanzi }}</span>
          <span class="text-xs" :class="pinyinFirst ? 'hanzi text-muted text-sm' : 'text-primary'">{{ pinyinFirst ? w.hanzi : w.pinyin }}</span>
        </button>
        <span v-if="!built.length" class="text-muted text-sm">Your sentence appears here — tap a word to remove it.</span>
      </div>
      <div v-if="built.length" class="mt-3 border-t border-default pt-3">
        <p class="text-primary text-lg">{{ pinyin }}</p>
        <p class="hanzi text-2xl">{{ hanzi }}</p>
        <p v-if="!result" class="text-sm text-muted mt-1">{{ built.map((w) => w.meaning.split(';')[0]).join(' · ') }}</p>
      </div>
      <div v-if="result" class="mt-3 rounded-xl p-3 text-sm" :class="result.status === 'issues' ? 'bg-warning/15' : 'bg-success/15'">
        <p v-if="result.status === 'real'" class="font-medium text-success">✓ That's a real sentence: “{{ result.known!.meaning }}”</p>
        <p v-else-if="result.status === 'ok'" class="font-medium text-success">✓ Word order looks fine. (Basic-pattern check — not a full grammar check.)</p>
        <template v-else>
          <p class="font-medium text-warning mb-1">Hmm, check these:</p>
          <ul class="list-disc pl-5 space-y-0.5">
            <li v-for="i in result.issues" :key="i">{{ i }}</li>
          </ul>
        </template>
      </div>
      <div class="flex gap-2 mt-3">
        <UButton :disabled="!built.length" icon="i-lucide-check" @click="validate">Check</UButton>
        <Speak v-if="built.length" :text="hanzi" />
        <UButton v-if="built.length" color="neutral" variant="ghost" icon="i-lucide-eraser" class="ml-auto" @click="built = []; result = null">Clear</UButton>
      </div>
    </UCard>

    <UTabs v-model="source" :items="sources" :content="false" size="sm" />
    <p v-if="source === 'mine' && !bank.length" class="text-sm text-muted">You haven't started any words yet — switch to HSK 1 or learn a unit first.</p>

    <section v-for="c in bank" :key="c.name" class="rounded-xl border border-default">
      <button class="w-full flex items-center justify-between px-4 py-3 font-medium" @click="open = open === c.name ? null : c.name">
        {{ c.name }} <span class="text-muted text-sm">{{ c.words.length }} <UIcon :name="open === c.name ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="align-middle" /></span>
      </button>
      <div v-if="open === c.name || bank.length <= 3" class="flex flex-wrap gap-2 px-4 pb-4">
        <button
          v-for="w in c.words" :key="w.id"
          class="px-3 py-1.5 rounded-lg bg-elevated border border-default hover:border-primary flex flex-col items-center leading-tight"
          :title="w.meaning"
          @click="add(w)"
        >
          <span :class="pinyinFirst ? 'text-primary font-medium' : 'hanzi text-xl'">{{ pinyinFirst ? w.pinyin : w.hanzi }}</span>
          <span class="text-xs text-muted">{{ w.meaning.split(';')[0] }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
