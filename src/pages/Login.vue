<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../api'
import { startSync } from '../sync'

const router = useRouter()
const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    const { token } = await api<{ token: string }>('POST', `/auth/${mode.value}`, { email: email.value, password: password.value })
    setToken(token)
    await startSync()
    router.replace('/')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-6 py-6">
    <p class="hanzi text-4xl font-bold">修炼 <span class="text-primary">Xiulian</span></p>
    <UCard class="w-full max-w-sm">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <UInput v-model="email" type="email" placeholder="Email" autocomplete="email" required size="xl" />
        <UInput v-model="password" type="password" placeholder="Password (8+ characters)" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="8" size="xl" />
        <p v-if="error" class="text-sm text-error">{{ error }}</p>
        <UButton type="submit" size="xl" block :loading="busy">{{ mode === 'login' ? 'Log in' : 'Create account' }}</UButton>
      </form>
    </UCard>
    <UButton variant="link" color="neutral" @click="mode = mode === 'login' ? 'signup' : 'login'">
      {{ mode === 'login' ? 'New here? Create an account' : 'Have an account? Log in' }}
    </UButton>
  </div>
</template>
