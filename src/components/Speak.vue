<script setup lang="ts">
import { speak, ttsAvailable } from '../tts'
defineProps<{ text: string; size?: 'sm' | 'md' | 'lg' | 'xl' }>()
</script>

<template>
  <UButton
    v-if="ttsAvailable"
    icon="i-lucide-volume-2"
    color="neutral"
    variant="soft"
    :size="size ?? 'md'"
    aria-label="Play audio"
    @click.stop="speak(text)"
  />
</template>
