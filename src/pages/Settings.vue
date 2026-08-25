<script setup lang="ts">
import { ref } from 'vue'
import { progress, exportProgress, importProgress, resetProgress } from '../store'
import { speak, ttsAvailable } from '../tts'
import { api, setToken } from '../api'
import { useToast } from '@nuxt/ui/composables'

const file = ref<HTMLInputElement>()
const focusItems = [
  { label: 'Pinyin', value: 'pinyin', icon: 'i-lucide-ear' },
  { label: 'Balanced', value: 'balanced', icon: 'i-lucide-scale' },
  { label: 'Characters', value: 'hanzi', icon: 'i-lucide-type' },
]
const toast = useToast()

function download() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }))
  a.download = `xiulian-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}
async function upload(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  try {
    const json = await f.text()
    const p = JSON.parse(json)
    if (!p.cards || !p.settings) throw new Error('Not a Xiulian backup')
    await api('PATCH', '/me/progress', p)
    importProgress(json)
  } catch (err) {
    toast.add({ title: 'Import failed', description: String(err), color: 'error' })
  }
}
async function reset() {
  if (!confirm('Delete all progress on your account?')) return
  try {
    await api('DELETE', '/me/progress')
    resetProgress()
  } catch (err) {
    toast.add({ title: 'Reset failed', description: String(err), color: 'error' })
  }
}
function logout() {
  setToken(null)
  localStorage.removeItem('xiulian.v1') // the next account on this device must not inherit this one's cache
  location.hash = '#/login'
  location.reload()
}
</script>

<template>
  <div class="flex flex-col gap-6 py-6">
    <h1 class="text-2xl font-bold">Settings</h1>

    <UCard>
      <p class="font-medium mb-1">Focus</p>
      <p class="text-sm text-muted mb-3">What the exercises emphasise. Pinyin: sounds and tones first, characters shown alongside. Characters: reading first.</p>
      <UTabs v-model="progress.settings.focus" :items="focusItems" :content="false" />
    </UCard>

    <UCard>
      <div class="flex flex-col gap-5">
        <label class="flex items-center justify-between gap-4">
          <span>
            <span class="font-medium block">Quiet mode</span>
            <span class="text-sm text-muted">No listening exercises and no autoplay — for public places. Speaker buttons still work if you tap them.</span>
          </span>
          <USwitch v-model="progress.settings.quiet" />
        </label>
        <label class="flex items-center justify-between gap-4">
          <span>
            <span class="font-medium block">Auto-play audio</span>
            <span class="text-sm text-muted">Hear each word when it appears and after you answer.</span>
          </span>
          <USwitch v-model="progress.settings.audioAutoplay" />
        </label>
        <label class="flex items-center justify-between gap-4">
          <span class="font-medium">Dark mode</span>
          <USwitch v-model="progress.settings.dark" />
        </label>
      </div>
    </UCard>

    <UCard>
      <p class="font-medium mb-1">Audio</p>
      <p class="text-sm text-muted mb-3">
        Uses your device's built-in Mandarin voice.
        <template v-if="!ttsAvailable">Speech synthesis is not available in this browser.</template>
        <template v-else>No sound? On Android install the Chinese voice in Google TTS settings; on iOS make sure the ringer isn't muted.</template>
      </p>
      <UButton color="neutral" variant="soft" icon="i-lucide-volume-2" :disabled="!ttsAvailable" @click="speak('你好，欢迎学习中文！')">Test voice</UButton>
    </UCard>

    <UCard>
      <p class="font-medium mb-1">Account</p>
      <p class="text-sm text-muted mb-3">Progress syncs to your account and follows you across devices. Export keeps a file copy; import replaces what's on the account.</p>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-download" @click="download">Export</UButton>
        <UButton color="neutral" variant="soft" icon="i-lucide-upload" @click="file?.click()">Import</UButton>
        <input ref="file" type="file" accept="application/json" class="hidden" @change="upload" />
        <UButton color="neutral" variant="soft" icon="i-lucide-log-out" @click="logout">Log out</UButton>
        <UButton color="error" variant="soft" icon="i-lucide-trash-2" class="ml-auto" @click="reset">Reset</UButton>
      </div>
    </UCard>

    <p class="text-xs text-muted">
      Data: HSK 3.0 vocabulary (complete-hsk-vocabulary, MIT), example sentences from Tatoeba (CC BY 2.0 FR).
    </p>
  </div>
</template>
