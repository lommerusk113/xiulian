import type { Exercise, Word } from './types'
import { units, sentences, words } from './data'
import { State } from 'ts-fsrs'
import { isKnown, dueIds, progress, wordById, todaysChallenge, tribulationWords, trialWords } from './store'
import { makeExercise, randomKind, shuffle, sentenceExercise } from './exercises'

const REVIEW_BATCH = 20
const wordOf = (id: string) => wordById.get(id)!
/** 0 = new/learning: only meaning-guessing; 1 = in review; 2 = stable a week+ → tone-precise pinyin exercises. */
function tierOf(id: string) {
  const c = progress.cards[id]
  if (!c || c.state !== State.Review) return 0
  return c.stability >= 7 ? 2 : 1
}

/** Words the learner has met — the only sensible source of distractors. */
function seenPool(extra: Word[] = []) {
  const pool = words.filter((w) => isKnown(w.id))
  return pool.length + extra.length >= 8 ? [...extra, ...pool] : [...extra, ...pool, ...words.filter((w) => w.level === 1).slice(0, 40)]
}

function pickSentences(filter: (s: (typeof sentences)[number]) => boolean, n: number): Exercise[] {
  return shuffle(sentences.filter(filter))
    .slice(0, n)
    .map((s) => {
      // a sentence may sneak in one unseen word: then it's a comprehension question (guessable from context), never tiles
      const fresh = [...new Set(s.tokens.filter((t) => !isKnown(t)))].map(wordOf)
      const ex = sentenceExercise(s, fresh.length || Math.random() < 0.5 ? 'sentenceMeaning' : 'sentence', wordOf)
      ex.newWords = fresh
      return ex
    })
}

export function buildLearn(unitId: string): Exercise[] {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return []
  const { focus, quiet } = progress.settings
  const unitWords = unit.wordIds.map(wordOf)
  const pool = seenPool(unitWords)
  const out: Exercise[] = []
  // theme lessons: heavy repetition — three drills per new word and a full second pass
  const heavy = unit.track === 'theme'
  // ponytail: chunks of 4 — introduce, then drill, then next chunk; keeps short-term load low
  for (let i = 0; i < unitWords.length; i += 4) {
    const chunk = unitWords.slice(i, i + 4)
    const drills: Exercise[] = []
    for (const w of chunk) {
      // repeats drill every word fully; only unseen words get an intro card
      if (!isKnown(w.id)) out.push({ kind: 'intro', word: w, options: [], tiles: [] })
      const tier = tierOf(w.id)
      const a = randomKind(w, focus, { quiet, tier })
      const b = randomKind(w, focus, { exclude: [a], quiet, tier })
      drills.push(makeExercise(a, w, pool), makeExercise(b, w, pool))
      if (heavy) drills.push(makeExercise(randomKind(w, focus, { exclude: [a, b], quiet, tier }), w, pool))
    }
    out.push(...shuffle(drills))
  }
  if (heavy) out.push(...shuffle(unitWords.map((w) => makeExercise(randomKind(w, focus, { quiet, tier: tierOf(w.id) }), w, pool))))
  // finish by combining: sentences that mix this unit's words with everything already known (more as you know more),
  // allowing at most one brand-new word per sentence so vocabulary sneaks in through context
  const ids = new Set(unit.wordIds)
  const n = Math.min(6, 3 + Math.floor(words.filter((w) => isKnown(w.id)).length / 40))
  const unknownCount = (s: { tokens: string[] }) => new Set(s.tokens.filter((t) => !ids.has(t) && !isKnown(t))).size
  out.push(...pickSentences((s) => s.tokens.some((t) => ids.has(t)) && unknownCount(s) <= 1, n))
  return out
}

/** 天劫: 20 questions from the whole realm, the 12 most-likely-forgotten words plus 8 at random. Always reading (hanzi focus) — the rank certifies reading. */
export const TRIBULATION_SIZE = 20
export function buildTribulation(stageIndex: number): Exercise[] {
  const { quiet } = progress.settings
  const all = tribulationWords(stageIndex)
  const ws = all.length <= TRIBULATION_SIZE ? all : [...all.slice(0, 12), ...shuffle(all.slice(12)).slice(0, TRIBULATION_SIZE - 12)]
  const pool = seenPool(ws)
  return shuffle(ws.map((w) => makeExercise(randomKind(w, 'hanzi', { quiet, tier: tierOf(w.id) }), w, pool)))
}

/** Weekly 试炼: the 20 known words closest to fading, graded early on purpose. */
export function buildTrial(): Exercise[] {
  const { quiet } = progress.settings
  const ws = trialWords().slice(0, TRIBULATION_SIZE)
  const pool = seenPool(ws)
  return shuffle(ws.map((w) => makeExercise(randomKind(w, 'hanzi', { quiet, tier: tierOf(w.id) }), w, pool)))
}

/** Daily challenge: one recognition exercise per fixed word, no intros, no retries, no grading. */
export function buildChallenge(): Exercise[] {
  const { focus, quiet } = progress.settings
  const ws = todaysChallenge().ids.map(wordOf)
  const pool = seenPool(ws)
  return shuffle(ws.map((w) => makeExercise(randomKind(w, focus, { quiet, tier: 0 }), w, pool)))
}

export function buildReview(): Exercise[] {
  const { focus, quiet } = progress.settings
  const due = dueIds.value.slice(0, REVIEW_BATCH).map(wordOf)
  const pool = seenPool()
  const out = due.map((w) => makeExercise(randomKind(w, focus, { quiet, tier: tierOf(w.id) }), w, pool))
  const dueSet = new Set(due.map((w) => w.id))
  const sents = pickSentences((s) => s.tokens.every(isKnown) && s.tokens.some((t) => dueSet.has(t)), Math.min(3, Math.floor(due.length / 5)))
  return shuffle([...out, ...sents])
}
