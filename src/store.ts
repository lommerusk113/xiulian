import { reactive, watch, computed } from 'vue'
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs'
import { words, units } from './data'
import type { Focus } from './types'
import { setAutoplay } from './tts'

interface Settings {
  /** what exercises emphasise: pinyin (sound), balanced, or characters */
  focus: Focus
  /** no listening exercises, no autoplay — for the gym / public transport */
  quiet: boolean
  audioAutoplay: boolean
  newPerLesson: number
  dark: boolean
}

interface LessonStrength {
  /** raw strength in percent at time t (can exceed 100) */
  p: number
  /** completions so far */
  n: number
  /** ms timestamp of last completion */
  t: number
}

interface Challenge {
  /** word ids fixed for the day */
  ids: string[]
  /** score of each attempt, in order */
  attempts: number[]
}

export interface Progress {
  cards: Record<string, Card>
  lessons: Record<string, LessonStrength>
  challenges: Record<string, Challenge>
  /** review timestamps (ms) for streak/stats */
  history: number[]
  settings: Settings
}

const KEY = 'xiulian.v1'
const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }))

function load(): Progress {
  const fallback: Progress = {
    cards: {},
    lessons: {},
    challenges: {},
    history: [],
    settings: { focus: 'pinyin', quiet: false, audioAutoplay: true, newPerLesson: 8, dark: true },
  }
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem('chuolingo.v1') // pre-rename progress
    if (!raw) return fallback
    const p = JSON.parse(raw) as Progress
    for (const c of Object.values(p.cards)) {
      c.due = new Date(c.due)
      if (c.last_review) c.last_review = new Date(c.last_review)
    }
    return { ...fallback, ...p, settings: { ...fallback.settings, ...p.settings } }
  } catch {
    return fallback
  }
}

export const progress = reactive<Progress>(load())
watch(progress, (p) => localStorage.setItem(KEY, JSON.stringify(p)), { deep: true })
watch(() => progress.settings.audioAutoplay && !progress.settings.quiet, setAutoplay, { immediate: true })
watch(() => progress.settings.dark, (d) => document.documentElement.classList.toggle('dark', d), { immediate: true })

export const wordById = new Map(words.map((w) => [w.id, w]))

export function isKnown(id: string) {
  return id in progress.cards
}

export function unitLearned(unitId: string) {
  const u = units.find((x) => x.id === unitId)!
  return u.wordIds.filter(isKnown).length
}

export const dueIds = computed(() => {
  const now = Date.now()
  return Object.entries(progress.cards)
    .filter(([, c]) => c.due.getTime() <= now)
    .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
    .map(([id]) => id)
})

export const knownCount = computed(() => Object.keys(progress.cards).length)

/** A word counts as "known" once FSRS predicts you'll remember it for this many days. It keeps being reviewed, just rarely. */
export const KNOWN_DAYS = 21
/** Share of a band's words that must be known to hold that HSK rank. */
export const RANK_THRESHOLD = 0.9

export function isMastered(id: string) {
  const c = progress.cards[id]
  return !!c && c.state === State.Review && c.stability >= KNOWN_DAYS
}

export const matureCount = computed(() => Object.keys(progress.cards).filter(isMastered).length)

export const bandStats = computed(() =>
  [1, 2, 3, 4].map((level) => {
    const ws = words.filter((w) => w.level === level)
    return {
      level,
      total: ws.length,
      started: ws.filter((w) => isKnown(w.id)).length,
      known: ws.filter((w) => isMastered(w.id)).length,
      need: Math.ceil(ws.length * RANK_THRESHOLD),
    }
  }),
)

/** Highest HSK band fully earned (0 = none yet). */
export const rank = computed(() => {
  let r = 0
  for (const b of bandStats.value) {
    if (b.known < b.need) break
    r = b.level
  }
  return r
})

/** Share of everyday film/TV subtitle speech covered by words you've started / know. */
export const coverage = computed(() => {
  let started = 0
  let known = 0
  for (const w of words) {
    if (!w.level || !isKnown(w.id)) continue
    started += w.share
    if (isMastered(w.id)) known += w.share
  }
  return { started, known }
})

/** Cultivation realms — 修炼 flavour for the rank card. Index = realm, not HSK band. */
export const REALMS = ['凡人 Mortal', '聚气 Qi Building', '炼气 Qi Refining', '筑基 Foundation', '金丹 Golden Core', '元婴 Nascent Soul']
const TEN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const QUARTERS: [string, string, number][] = [['初期', 'Early', 0.1], ['中期', 'Mid', 0.4], ['后期', 'Late', 0.7], ['圆满', 'Peak', 1]]

export interface Stage {
  realm: number
  /** sub-stage, e.g. 三层 / 中期 (empty for Mortal) */
  hanzi: string
  name: string
  /** which count of which HSK band must reach `target` */
  metric: 'started' | 'known'
  band: number
  target: number
}

const bandTotal = (level: number) => words.filter((w) => w.level === level).length
const bandNeed = (level: number) => Math.ceil(bandTotal(level) * RANK_THRESHOLD)

/**
 * The ladder, lowest first. Qi Building climbs with HSK 1 words *started* (moves every lesson);
 * Qi Refining with HSK 1 words *known*; the three big realms with HSK 2/3/4 known, earned in order.
 * Reaching 炼气十层 = HSK rank 1, 筑基圆满 = rank 2, and so on.
 */
export const STAGES: Stage[] = [
  { realm: 0, hanzi: '', name: '', metric: 'started', band: 1, target: 0 },
  ...TEN.map((n, i) => ({ realm: 1, hanzi: `${n}层`, name: `${i + 1}`, metric: 'started' as const, band: 1, target: Math.round((bandTotal(1) * (i + 1)) / 10) })),
  ...TEN.map((n, i) => ({ realm: 2, hanzi: `${n}层`, name: `${i + 1}`, metric: 'known' as const, band: 1, target: Math.round((bandNeed(1) * (i + 1)) / 10) })),
  ...[2, 3, 4].flatMap((band, r) => QUARTERS.map(([hanzi, name, f]) => ({ realm: r + 3, hanzi, name, metric: 'known' as const, band, target: Math.round(bandNeed(band) * f) }))),
]

/** Current count behind a stage's requirement; 0 until the previous band is earned. */
export function stageValue(s: Stage) {
  const bands = bandStats.value
  if (s.band > 1 && bands[s.band - 2].known < bands[s.band - 2].need) return 0
  const b = bands[s.band - 1]
  return s.metric === 'started' ? b.started : b.known
}

/** Highest stage whose requirement is met. */
export const stage = computed(() => STAGES.reduce((best, s, i) => (stageValue(s) >= s.target ? i : best), 0))
export const nextStage = computed<Stage | undefined>(() => STAGES[stage.value + 1])

export const stageLabel = (s: Stage) => {
  const [realmHanzi, ...rest] = REALMS[s.realm].split(' ')
  return { realm: realmHanzi, sub: s.hanzi, name: `${rest.join(' ')}${s.name ? ' ' + s.name : ''}` }
}

export const nextBand = computed(() => bandStats.value.find((b) => b.level === rank.value + 1))

/** Grade a word. Creates the card on first grade. */
export function grade(id: string, correct: boolean) {
  const now = new Date()
  const card = progress.cards[id] ?? createEmptyCard(now)
  const { card: next } = scheduler.next(card, now, correct ? Rating.Good : Rating.Again)
  progress.cards[id] = next
  progress.history.push(now.getTime())
}

export const streak = computed(() => {
  const days = new Set(progress.history.map((t) => new Date(t).toDateString()))
  let n = 0
  const d = new Date()
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (days.has(d.toDateString())) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
})

/** Next core unit that isn't fully learned. */
export const nextUnit = computed(() => units.find((u) => u.track === 'core' && unitLearned(u.id) < u.wordIds.length))

// ---- lesson strength: +100% per completion, decays daily; more completions → slower decay (floor 10%/day) ----
const DAY = 86_400_000
export const TIER_COLORS = ['var(--ui-primary)', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899']
/** Daily loss in percent of current strength. 1 completion → 100, 2 → 99, … floor 10. */
export const dailyLoss = (completions: number) => Math.max(10, 101 - completions)
/** Completions needed to climb one tier: 1 to reach ×1, 2 to reach ×2, then 4 for every tier after. */
export const tierCost = (tier: number) => Math.min(4, 2 ** tier)
/** Decay ticks at local midnight, not 24 h after the completion. */
const calendarDays = (from: number, to: number) => Math.round((new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0)) / DAY)

export function lessonStrength(unitId: string, now = Date.now()) {
  const l = progress.lessons[unitId]
  if (!l) return { strength: 0, tier: 0, completions: 0, loss: dailyLoss(0), toNext: 1 }
  const days = calendarDays(l.t, now)
  const loss = dailyLoss(l.n)
  const strength = l.p * Math.pow(1 - loss / 100, Math.max(0, days))
  const tier = Math.floor(strength / 100)
  const toNext = Math.ceil(((tier + 1) * 100 - strength) / (100 / tierCost(tier)))
  return { strength, tier, completions: l.n, loss, toNext }
}

export function completeLesson(unitId: string) {
  const now = Date.now()
  const { strength, tier } = lessonStrength(unitId, now)
  const n = (progress.lessons[unitId]?.n ?? 0) + 1
  progress.lessons[unitId] = { p: strength + 100 / tierCost(tier), n, t: now }
}

// ---- daily challenge: fixed for the day, mostly tomorrow's words → hard before the lesson, doable after ----
export const CHALLENGE_SIZE = 10
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10)

export function todaysChallenge() {
  const key = todayKey()
  if (!progress.challenges[key]) {
    const next = nextUnit.value?.wordIds.filter((id) => !isKnown(id)) ?? []
    const weakest = Object.entries(progress.cards)
      .filter(([id]) => wordById.get(id)?.level)
      .sort((a, b) => a[1].stability - b[1].stability)
      .map(([id]) => id)
    const ids = [...next.slice(0, 6), ...weakest.filter((id) => !next.includes(id)).slice(0, CHALLENGE_SIZE)]
    // top up from the unit after next if the learner has few words yet
    for (const u of units.filter((u) => u.track === 'core')) {
      if (ids.length >= CHALLENGE_SIZE) break
      for (const id of u.wordIds) if (ids.length < CHALLENGE_SIZE && !ids.includes(id)) ids.push(id)
    }
    progress.challenges[key] = { ids: ids.slice(0, CHALLENGE_SIZE), attempts: [] }
  }
  return progress.challenges[key]
}

export function recordChallenge(score: number) {
  todaysChallenge().attempts.push(score)
}

/** Best score per day for the last n days (oldest first). */
export function challengeHistory(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    const c = progress.challenges[todayKey(d)]
    return { day: d.toLocaleDateString(undefined, { weekday: 'short' }), best: c?.attempts.length ? Math.max(...c.attempts) : null, attempts: c?.attempts.length ?? 0 }
  })
}

export function exportProgress() {
  return JSON.stringify(progress)
}

export function importProgress(json: string) {
  const p = JSON.parse(json) as Progress
  if (!p.cards || !p.settings) throw new Error('Not a Xiulian backup')
  localStorage.setItem(KEY, json)
  location.reload()
}

export function resetProgress() {
  localStorage.removeItem(KEY)
  location.reload()
}
