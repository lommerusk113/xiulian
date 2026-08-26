<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ options: string[]; correct: string; hanzi?: boolean; pinyin?: boolean }>()
const emit = defineEmits<{ answer: [correct: boolean] }>()
const picked = ref<string>()

function pick(o: string) {
  if (picked.value) return
  picked.value = o
  emit('answer', o === props.correct)
}
function color(o: string) {
  if (!picked.value) return 'border-default bg-elevated hover:border-primary'
  if (o === props.correct) return 'border-success bg-success/10 text-success'
  if (o === picked.value) return 'border-error bg-error/10 text-error'
  return 'border-default opacity-50'
}
function onKey(e: KeyboardEvent) {
  const i = +e.key - 1
  if (i >= 0 && i < props.options.length) pick(props.options[i])
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="grid gap-3" :class="hanzi || pinyin ? 'grid-cols-2' : 'grid-cols-1'">
    <button
      v-for="(o, i) in options"
      :key="o"
      class="relative border-2 rounded-xl px-4 py-4 text-left transition-colors min-h-16"
      :class="[color(o), hanzi ? 'hanzi text-3xl text-center py-6' : pinyin ? 'text-2xl text-center py-6 break-words' : 'text-base']"
      @click="pick(o)"
    >
      <span class="hidden sm:block absolute top-1.5 left-2 text-xs text-muted font-mono">{{ i + 1 }}</span>
      {{ o }}
    </button>
  </div>
</template>
