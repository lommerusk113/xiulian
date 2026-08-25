// ponytail: native speechSynthesis; swap for a WASM TTS only if voices are missing on your devices.
let voice: SpeechSynthesisVoice | undefined

function pickVoice() {
  const voices = speechSynthesis.getVoices()
  const zh = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('zh-cn'))
  voice = zh.find((v) => /Tingting|Google|Xiaoxiao|Yunxi|Premium|Enhanced/i.test(v.name)) ?? zh[0]
    ?? voices.find((v) => v.lang.toLowerCase().startsWith('zh'))
}

if (typeof speechSynthesis !== 'undefined') {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export const ttsAvailable = typeof speechSynthesis !== 'undefined'

/** Set by the store: when true, only explicit taps on a speaker button make sound. */
export let autoplayAllowed = true
export const setAutoplay = (v: boolean) => (autoplayAllowed = v)

export function speak(text: string, rate = 0.85, auto = false) {
  if (!ttsAvailable || (auto && !autoplayAllowed)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  if (voice) u.voice = voice
  u.rate = rate
  speechSynthesis.speak(u)
}
