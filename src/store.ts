import { reactive, ref, watch, computed } from 'vue'
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card } from 'ts-fsrs'
import { words, units, sentences } from './data'
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
  /** ladder stage index → ms timestamp the 天劫 was passed */
  tribulations: Record<string, number>
  /** named timestamps: `trial` = last weekly 试炼, `trib-fail-<stage>` = last failed 天劫 attempt, `read-<realm>` = Readibu milestone */
  marks: Record<string, number>
  /** true retention per local day: yyyy-mm-dd → [due reviews asked, answered right] */
  retention: Record<string, [number, number]>
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
    tribulations: {},
    marks: {},
    retention: {},
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

/** Due is day-granular: a card due at 21:00 is due all day, so an evening review doesn't slip it a day. */
const endOfToday = () => new Date().setHours(24, 0, 0, 0)
export const dueIds = computed(() => {
  clock.value // re-evaluate when the clock ticks
  const end = endOfToday()
  return Object.entries(progress.cards)
    .filter(([, c]) => c.due.getTime() < end)
    .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
    .map(([id]) => id)
})

export const knownCount = computed(() => Object.keys(progress.cards).length)

/** A word counts as "known" once FSRS predicts you'll remember it for this many days. It keeps being reviewed, just rarely. */
export const KNOWN_DAYS = 21
/** Share of a band's words that must be known to hold that HSK rank. */
export const RANK_THRESHOLD = 0.9

/** Below this chance of recalling a word right now, it stops counting as known — rank decays with neglect. */
export const KNOWN_RECALL = 0.8
/** Coarse clock so "known" is re-evaluated as time passes without a change; bumped on app start and each session. */
export const clock = ref(Date.now())
export const tick = () => (clock.value = Date.now())
export const recall = (id: string, now = clock.value) => scheduler.get_retrievability(progress.cards[id], now, false)

export function isMastered(id: string) {
  const c = progress.cards[id]
  return !!c && c.state === State.Review && c.stability >= KNOWN_DAYS && recall(id) >= KNOWN_RECALL
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
/** grey mortal, orange qi-building, cyan qi, earth-green foundation, gold core, purple soul */
export const REALM_COLORS = ['#a3a3a3', '#f97316', '#06b6d4', '#84cc16', '#eab308', '#8b5cf6']
const TEN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const QUARTERS: [string, string, number][] = [['初期', 'Early', 0.1], ['中期', 'Mid', 0.4], ['后期', 'Late', 0.7], ['圆满', 'Peak', 1]]

export interface Stage {
  realm: number
  /** sub-stage, e.g. 三层 / 中期 (empty for Mortal) */
  hanzi: string
  name: string
  /** which count of which HSK band must reach `target`: core units completed, or words known */
  metric: 'completed' | 'known'
  band: number
  target: number
  /** what stands between you and this stage: a 突破 (breakthrough) for 层 steps, a 天劫 (heavenly tribulation) at the gates of the great realms */
  rite: '突破' | '天劫'
}

const bandTotal = (level: number) => words.filter((w) => w.level === level).length
const bandNeed = (level: number) => Math.ceil(bandTotal(level) * RANK_THRESHOLD)
const bandUnits = (level: number) => units.filter((u) => u.track === 'core' && u.title.startsWith(`HSK ${level} `))
/** Core units of a band completed at least once. */
export const bandCompleted = (level: number) => bandUnits(level).filter((u) => progress.lessons[u.id]).length

/**
 * The ladder, lowest first. Qi Building climbs ten 层 with HSK 1 units *completed*; Qi Refining ten 层 with HSK 1 words *known*
 * (once every HSK 1 unit is done); the great realms 筑基/金丹/元婴 move slowly, as cultivation should — four stages each on HSK 2/3/4 known, in order.
 * 炼气十层 = HSK rank 1, 筑基圆满 = rank 2, and so on.
 */
export const STAGES: Stage[] = [
  { realm: 0, hanzi: '', name: '', metric: 'completed', band: 1, target: 0, rite: '突破' },
  ...TEN.map((n, i) => ({ realm: 1, hanzi: `${n}层`, name: `${i + 1}`, metric: 'completed' as const, band: 1, target: Math.ceil((bandUnits(1).length * (i + 1)) / 10), rite: '突破' as const })),
  ...TEN.map((n, i) => ({ realm: 2, hanzi: `${n}层`, name: `${i + 1}`, metric: 'known' as const, band: 1, target: Math.round((bandNeed(1) * (i + 1)) / 10), rite: '突破' as const })),
  ...[2, 3, 4].flatMap((band, r) => QUARTERS.map(([hanzi, name, f]) => ({ realm: r + 3, hanzi, name, metric: 'known' as const, band, target: Math.round(bandNeed(band) * f), rite: (hanzi === '初期' || hanzi === '圆满' ? '天劫' : '突破') as '突破' | '天劫' }))),
]

/** Current count behind a stage's requirement; 0 until the previous realm is finished. */
export function stageValue(s: Stage) {
  const bands = bandStats.value
  if (s.metric === 'completed') return bandCompleted(s.band)
  if (s.band === 1 && bandCompleted(1) < bandUnits(1).length) return 0
  if (s.band > 1 && bands[s.band - 2].known < bands[s.band - 2].need) return 0
  return bands[s.band - 1].known
}

const stageMet = (i: number) => stageValue(STAGES[i]) >= STAGES[i].target
const midnight = () => new Date(clock.value).setHours(0, 0, 0, 0)
/** Highest stage held: every stage up to it has its requirement met (live — rank decays) and its 天劫 passed. */
export const stage = computed(() => {
  let i = 0
  while (i + 1 < STAGES.length && stageMet(i + 1) && progress.tribulations[i + 1]) i++
  return i
})
/** After a failed 天劫 you must complete a lesson before facing it again. */
const lessonSince = (t: number) => Object.values(progress.lessons).some((l) => l.t > t)
/** The next stage, when its requirement is met and its 天劫 can be faced: one breakthrough a day; after a fail, a lesson first. */
export const pendingStage = computed<number | undefined>(() => {
  const i = stage.value + 1
  if (i >= STAGES.length || !stageMet(i)) return undefined
  const passedToday = Object.values(progress.tribulations).some((t) => t >= midnight())
  const fail = progress.marks[`trib-fail-${i}`]
  return passedToday || (fail && !lessonSince(fail)) ? undefined : i
})
/** Why the next stage is met but not offered right now. */
export const pendingBlocked = computed(() => {
  const i = stage.value + 1
  if (i >= STAGES.length || !stageMet(i) || pendingStage.value !== undefined) return null
  const fail = progress.marks[`trib-fail-${i}`]
  return fail && !lessonSince(fail) ? 'failed' : 'passed'
})
/** 聚气 stage reached by completing the n-th HSK 1 unit (1-based), if any — for rank-up markers in the unit list. */
export function stageAtUnit(n: number) {
  const i = STAGES.findIndex((s) => s.metric === 'completed' && s.target === n)
  return i > 0 ? i : undefined
}
/** Theme lessons sharing words with a unit — what to do first to be ready for it. */
export function themeUnitsFor(unitId: string) {
  const u = units.find((x) => x.id === unitId)
  if (!u) return []
  return units
    .filter((t) => t.track === 'theme')
    .map((t) => ({ unit: t, shared: t.wordIds.filter((w) => u.wordIds.includes(w)).length, done: !!progress.lessons[t.id] }))
    .filter((x) => x.shared)
    .sort((a, b) => b.shared - a.shared)
}
/** Core units that contain any of the given words, for "repeat these" after a failed 天劫. */
export const unitsWith = (ids: string[]) => units.filter((u) => u.track === 'core' && u.wordIds.some((w) => ids.includes(w)))
export const nextStage = computed<Stage | undefined>(() => STAGES[stage.value + 1])

/** A retake keeps the original stamp, so practising an old 天劫 never spends today's breakthrough. */
export function passTribulation(stageIndex: number) {
  progress.tribulations[stageIndex] ??= Date.now()
}
/** Failing a stage you already hold is practice — no mark. */
export function failTribulation(stageIndex: number) {
  if (!progress.tribulations[stageIndex]) progress.marks[`trib-fail-${stageIndex}`] = Date.now()
}

/** Words a stage's 天劫 draws from: everything started in the realm so far, most likely forgotten first. */
export function tribulationWords(stageIndex: number) {
  const s = STAGES[stageIndex]
  const ids =
    s.realm <= 1
      ? new Set(bandUnits(1).filter((u) => progress.lessons[u.id]).flatMap((u) => u.wordIds))
      : new Set(words.filter((w) => w.level >= 1 && w.level <= s.realm - 1).map((w) => w.id))
  const now = Date.now()
  return [...ids]
    .filter(isKnown)
    .map((id) => wordById.get(id)!)
    .sort((a, b) => recall(a.id, now) - recall(b.id, now))
}

// ---- weekly 试炼: the known words closest to fading; right keeps them known, wrong drops them ----
export const TRIAL_DAYS = 7
export const TRIAL_MIN_WORDS = 10
export const trialDue = computed(() => clock.value - (progress.marks.trial ?? 0) >= TRIAL_DAYS * DAY && matureCount.value >= TRIAL_MIN_WORDS)
export const trialDaysLeft = computed(() => Math.max(0, Math.ceil((TRIAL_DAYS * DAY - (clock.value - (progress.marks.trial ?? 0))) / DAY)))
export function trialWords() {
  const now = Date.now()
  return Object.keys(progress.cards)
    .filter(isMastered)
    .map((id) => wordById.get(id)!)
    .sort((a, b) => recall(a.id, now) - recall(b.id, now))
}
export function completeTrial() {
  progress.marks.trial = Date.now()
}

/** Share of due reviews answered right over the last 7 days, or null with too little data. */
export const retention7 = computed(() => {
  let asked = 0
  let right = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(clock.value)
    d.setDate(d.getDate() - i)
    const r = progress.retention[todayKey(d)]
    if (r) {
      asked += r[0]
      right += r[1]
    }
  }
  return asked >= 20 ? right / asked : null
})

// ---- read mode: sentences you can understand, no hearts, no grading ----
export const READ_SIZE = 20
export function readableSentences() {
  return sentences.filter((s) => s.tokens.filter((t) => !isKnown(t)).length <= 1 && s.tokens.some(isKnown))
}

export const stageLabel = (s: Stage) => {
  const [realmHanzi, ...rest] = REALMS[s.realm].split(' ')
  return { realm: realmHanzi, sub: s.hanzi, name: `${rest.join(' ')}${s.name ? ' ' + s.name : ''}` }
}

export const nextBand = computed(() => bandStats.value.find((b) => b.level === rank.value + 1))

/**
 * Grade a word. Creates the card on first grade.
 * A correct answer on a word that isn't due yet doesn't reschedule it (redoing a lesson must not fake retention);
 * misses always count. `force` is for the weekly trial, whose whole point is confirming early.
 */
export function grade(id: string, correct: boolean, force = false) {
  const now = new Date()
  const card = progress.cards[id] ?? createEmptyCard(now)
  progress.history.push(now.getTime())
  const due = card.due.getTime() < endOfToday()
  if (correct && !force && card.state === State.Review && !due) return
  if (card.state === State.Review && due) {
    const r = (progress.retention[todayKey(now)] ??= [0, 0])
    r[0]++
    if (correct) r[1]++
  }
  const { card: next } = scheduler.next(card, now, correct ? Rating.Good : Rating.Again)
  progress.cards[id] = next
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

/** Next core unit: the first one never completed. Core units unlock in order. */
export const nextUnit = computed(() => units.find((u) => u.track === 'core' && !progress.lessons[u.id]))
export function unitLocked(unitId: string) {
  const i = units.findIndex((u) => u.id === unitId)
  const u = units[i]
  if (!u || u.track !== 'core') return false
  const prev = units[i - 1]
  return !!prev && prev.track === 'core' && !progress.lessons[prev.id] && !progress.lessons[u.id]
}

// ---- lesson strength: +100% per completion, decays daily; more completions → slower decay (floor 10%/day) ----
const DAY = 86_400_000
export const TIER_COLORS = ['var(--ui-primary)', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899']
/** Completions needed to climb one tier: 1 to reach ×1, 2 to reach ×2, then 4 for every tier after. */
export const tierCost = (tier: number) => Math.min(4, 2 ** tier)
/** One completion's worth at a given strength — what a completion adds and what a missed day removes. */
export const stepAt = (strength: number) => 100 / tierCost(Math.floor(strength / 100))
/** Decay ticks at local midnight, not 24 h after the completion. */
const calendarDays = (from: number, to: number) => Math.round((new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0)) / DAY)
const trackOf = (unitId: string) => units.find((u) => u.id === unitId)?.track
/** Only the most recently completed lesson in each track fades; the rest keep the strength they had when you moved on. */
export function latestIn(track: string | undefined) {
  let best: string | undefined
  for (const [id, l] of Object.entries(progress.lessons)) {
    if (trackOf(id) === track && (!best || l.t > progress.lessons[best].t)) best = id
  }
  return best
}

/** Theme rings all fade: 100% per missed day, 10% less for every completion — ten completions and the ring never fades again. */
export const themeLoss = (completions: number) => Math.max(0, 100 - 10 * completions)

export function lessonStrength(unitId: string, now = Date.now()) {
  const l = progress.lessons[unitId]
  const track = trackOf(unitId)
  if (!l) return { strength: 0, tier: 0, completions: 0, gain: stepAt(0), loss: track === 'theme' ? themeLoss(0) : stepAt(0), fading: false, toNext: 1 }
  let strength = l.p
  let fading: boolean
  if (track === 'theme') {
    fading = themeLoss(l.n) > 0
    strength = Math.max(0, strength - themeLoss(l.n) * Math.max(0, calendarDays(l.t, now)))
  } else {
    // HSK / media: only the latest lesson fades, one completion's worth per missed day
    fading = latestIn(track) === unitId
    for (let d = fading ? calendarDays(l.t, now) : 0; d > 0 && strength > 0; d--) strength = Math.max(0, strength - stepAt(strength))
  }
  const tier = Math.floor(strength / 100)
  const toNext = Math.ceil(((tier + 1) * 100 - strength) / stepAt(strength))
  return { strength, tier, completions: l.n, gain: stepAt(strength), loss: track === 'theme' ? themeLoss(l.n) : stepAt(strength), fading, toNext }
}

export function completeLesson(unitId: string) {
  const now = Date.now()
  // HSK / media: the lesson that was fading until now freezes at its current strength (themes all keep fading)
  const prev = trackOf(unitId) === 'theme' ? undefined : latestIn(trackOf(unitId))
  if (prev && prev !== unitId) progress.lessons[prev] = { ...progress.lessons[prev], p: lessonStrength(prev, now).strength }
  const { strength } = lessonStrength(unitId, now)
  const n = (progress.lessons[unitId]?.n ?? 0) + 1
  progress.lessons[unitId] = { p: strength + stepAt(strength), n, t: now }
}

// ---- daily challenge: fixed for the day, mostly tomorrow's words → hard before the lesson, doable after ----
export const CHALLENGE_SIZE = 10
/** Local calendar day (sv-SE formats as yyyy-mm-dd) — same boundary as streak, fading and 天劫. */
export const todayKey = (d = new Date()) => d.toLocaleDateString('sv-SE')

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
  progress.history.push(Date.now()) // a challenge counts as a study day for the streak
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
