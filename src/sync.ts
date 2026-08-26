import { watch } from 'vue'
import { progress, type Progress } from './store'
import { api, getToken } from './api'

// What the server last confirmed, per entry, so each flush sends only what changed.
// ponytail: last-write-wins on load — server state replaces local unless the account is empty.
// Upgrade path if two devices go offline: merge cards by last_review instead of replacing.
const snap = { cards: {} as Record<string, string>, lessons: {} as Record<string, string>, challenges: {} as Record<string, string>, tribulations: {} as Record<string, string>, history: 0, settings: '' }
let timer: ReturnType<typeof setTimeout> | undefined
let inflight = false
let dirty = false

function snapshot() {
  for (const s of ['cards', 'lessons', 'challenges', 'tribulations'] as const) {
    snap[s] = Object.fromEntries(Object.entries(progress[s]).map(([k, v]) => [k, JSON.stringify(v)]))
  }
  snap.history = progress.history.length
  snap.settings = JSON.stringify(progress.settings)
}

function delta(): Partial<Progress> | null {
  const d: Partial<Progress> = {}
  for (const s of ['cards', 'lessons', 'challenges', 'tribulations'] as const) {
    for (const [k, v] of Object.entries(progress[s])) {
      if (snap[s][k] !== JSON.stringify(v)) ((d as any)[s] ??= {})[k] = v
    }
  }
  if (progress.history.length > snap.history) d.history = progress.history.slice(snap.history)
  if (JSON.stringify(progress.settings) !== snap.settings) d.settings = progress.settings
  return Object.keys(d).length ? d : null
}

async function flush() {
  if (inflight || !getToken()) return (dirty = true)
  const d = delta()
  if (!d) return
  inflight = true
  // remember what this request carries; a change that lands while it is in flight must stay unsynced
  const ser = (m?: Record<string, unknown>) => Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, JSON.stringify(v)]))
  const sent = { cards: ser(d.cards), lessons: ser(d.lessons), challenges: ser(d.challenges), tribulations: ser(d.tribulations), history: d.history?.length ?? 0, settings: d.settings ? JSON.stringify(d.settings) : null }
  try {
    await api('PATCH', '/me/progress', d)
    Object.assign(snap.cards, sent.cards)
    Object.assign(snap.lessons, sent.lessons)
    Object.assign(snap.challenges, sent.challenges)
    Object.assign(snap.tribulations, sent.tribulations)
    snap.history += sent.history
    if (sent.settings) snap.settings = sent.settings
  } catch {
    // keep the snapshot as-is: the next change (or coming back online) re-sends everything still unsynced
  } finally {
    inflight = false
    if (dirty) {
      dirty = false
      schedule()
    }
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(flush, 1000)
}

function revive(p: Progress) {
  for (const c of Object.values(p.cards)) {
    c.due = new Date(c.due)
    c.last_review = c.last_review ? new Date(c.last_review) : undefined
  }
  return p
}

let started = false

/** Pull the account's progress, then push local changes as they happen. Safe to call again after login. */
export async function startSync() {
  if (!getToken()) return
  try {
    const remote = revive(await api<Progress>('GET', '/me/progress'))
    const empty = !Object.keys(remote.cards).length && !remote.settings
    if (empty) {
      // fresh account: keep whatever this device already has and push it
      snapshot()
      snap.cards = snap.lessons = snap.challenges = snap.tribulations = {}
      snap.history = 0
      snap.settings = ''
    } else {
      Object.assign(progress, { cards: remote.cards, lessons: remote.lessons, challenges: remote.challenges, tribulations: remote.tribulations ?? {}, history: remote.history, settings: { ...progress.settings, ...remote.settings } })
      snapshot()
    }
  } catch {
    // offline: work from the local cache, sync when a change gets through
  }
  if (!started) {
    started = true
    watch(progress, schedule, { deep: true })
    window.addEventListener('online', schedule)
  }
  schedule()
}
