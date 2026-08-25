<script setup lang="ts">
import { computed, ref } from 'vue'
import { words } from '../data'

const pinyinOf = new Map(words.map((w) => [w.hanzi, w.pinyin]))

const props = defineProps<{ tiles: string[]; answer: string[]; pinyin?: boolean }>()
const emit = defineEmits<{ answer: [correct: boolean] }>()
const chosen = ref<number[]>([])
const done = ref(false)
const remaining = computed(() => props.tiles.map((t, i) => ({ t, i })).filter(({ i }) => !chosen.value.includes(i)))

function add(i: number) {
  if (done.value) return
  chosen.value.push(i)
}
function remove(pos: number) {
  if (done.value) return
  chosen.value.splice(pos, 1)
}
function check() {
  done.value = true
  const got = chosen.value.map((i) => props.tiles[i])
  emit('answer', got.length === props.answer.length && got.every((t, i) => t === props.answer[i]))
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="min-h-20 border-b-2 border-dashed border-default flex flex-wrap gap-2 items-end pb-3">
      <button
        v-for="(i, pos) in chosen"
        :key="i"
        class="hanzi text-2xl px-4 py-2 rounded-lg bg-primary/15 border border-primary/40 flex flex-col items-center"
        :class="done && 'pointer-events-none'"
        @click="remove(pos)"
      >{{ tiles[i] }}<span v-if="pinyin" class="text-xs text-primary font-sans">{{ pinyinOf.get(tiles[i]) }}</span></button>
      <span v-if="!chosen.length" class="text-muted text-sm">Tap the tiles in order</span>
    </div>
    <div class="flex flex-wrap gap-2 justify-center">
      <button
        v-for="{ t, i } in remaining"
        :key="i"
        class="hanzi text-2xl px-4 py-2 rounded-lg bg-elevated border border-default hover:border-primary flex flex-col items-center"
        :class="done && 'pointer-events-none opacity-50'"
        @click="add(i)"
      >{{ t }}<span v-if="pinyin" class="text-xs text-primary font-sans">{{ pinyinOf.get(t) }}</span></button>
    </div>
    <UButton v-if="!done" size="xl" block :disabled="!chosen.length" @click="check">Check</UButton>
  </div>
</template>
