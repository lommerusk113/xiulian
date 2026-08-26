<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Word } from '../types'
import { sentences } from '../data'
import { isKnown, progress } from '../store'
import { homophones } from '../exercises'
import { speak } from '../tts'
import Speak from './Speak.vue'

const props = defineProps<{ word: Word }>()
const emit = defineEmits<{ done: [] }>()

const pinyinFirst = computed(() => progress.settings.focus === 'pinyin')
// 他 她 它 are all tā: the character is the only difference, so say so instead of letting a question hinge on it
const twins = computed(() => homophones(props.word, isKnown))
const example = computed(() =>
  sentences.find((s) => s.tokens.includes(props.word.id) && s.tokens.every((t) => t === props.word.id || isKnown(t))),
)
onMounted(() => speak(props.word.hanzi, 0.85, true))
</script>

<template>
  <div class="flex flex-col items-center text-center gap-6 py-6">
    <UBadge color="neutral" variant="subtle">{{ word.level ? 'New word' : 'New phrase' }}</UBadge>
    <button class="flex flex-col items-center gap-2" @click="speak(word.hanzi)">
      <template v-if="pinyinFirst">
        <span class="text-5xl sm:text-6xl font-semibold text-primary tracking-wide">{{ word.pinyin }}</span>
        <span class="hanzi text-5xl text-muted">{{ word.hanzi }}</span>
      </template>
      <template v-else>
        <span class="hanzi text-7xl sm:text-8xl font-medium tracking-wide">{{ word.hanzi }}</span>
        <span class="text-2xl text-primary font-medium">{{ word.pinyin }}</span>
      </template>
    </button>
    <p class="text-xl">{{ word.meaning }}</p>
    <p v-if="word.pattern" class="text-sm text-muted -mt-2"><span class="hanzi">{{ word.pattern }}</span></p>
    <Speak :text="word.hanzi" size="lg" />
    <div v-if="twins.length" class="text-sm bg-elevated rounded-xl p-4 w-full text-left">
      <p class="text-muted mb-2">Sounds the same — the character is the only difference:</p>
      <p v-for="t in twins" :key="t.id" class="flex items-baseline gap-2">
        <span class="hanzi text-xl">{{ t.hanzi }}</span>
        <span class="text-primary">{{ t.pinyin }}</span>
        <span class="text-muted">{{ t.meaning }}</span>
      </p>
    </div>
    <div v-if="example" class="text-sm bg-elevated rounded-xl p-4 w-full">
      <p class="text-primary text-lg">{{ example.pinyin }}</p>
      <p class="hanzi text-xl">{{ example.hanzi }}</p>
      <p class="text-muted italic">{{ example.meaning }}</p>
    </div>
    <UButton size="xl" block class="mt-auto" @click="emit('done')">Got it</UButton>
  </div>
</template>
