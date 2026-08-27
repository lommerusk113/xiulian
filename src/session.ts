import type { Exercise, ExerciseKind, Word } from './types'
import { units, sentences, words } from './data'
import { State } from 'ts-fsrs'
import { isKnown, dueIds, progress, wordById, todaysChallenge, tribulationWords, trialWords, readableSentences, READ_SIZE } from './store'
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

/** @param missed words missed on the previous attempt — they get their intro card back, so a retake teaches before it tests */
export function buildLearn(unitId: string, missed: string[] = []): Exercise[] {
  const unit = units.find((u) => u.id === unitId)
  if (!unit) return []
  const { focus, quiet } = progress.settings
  const unitWords = unit.wordIds.map(wordOf)
  const pool = seenPool(unitWords)
  const out: Exercise[] = []
  const heavy = unit.track === 'theme'
  if (heavy) {
    // Theme lessons teach, they don't test: every word of the lesson gets its card, a first drill, the card again, a second drill —
    // in chunks of 3 — then a third drill for each word, then a second pass that also revisits the weakest words from the theme's earlier lessons.
    const drill = (w: Word, exclude: ExerciseKind[] = []) => makeExercise(randomKind(w, focus, { exclude, quiet, tier: tierOf(w.id) }), w, pool)
    const later: Exercise[] = []
    for (let i = 0; i < unitWords.length; i += 3) {
      const chunk = unitWords.slice(i, i + 3)
      const first = chunk.map((w) => drill(w))
      const second = chunk.map((w, k) => drill(w, [first[k].kind]))
      for (const w of chunk) out.push({ kind: 'intro', word: w, options: [], tiles: [] })
      out.push(...shuffle(first))
      for (const w of chunk) out.push({ kind: 'intro', word: w, options: [], tiles: [] })
      out.push(...shuffle(second))
      later.push(...chunk.map((w, k) => drill(w, [first[k].kind, second[k].kind])))
    }
    out.push(...shuffle(later))
    const earlier = units
      .filter((u) => u.track === 'theme' && u.theme === unit.theme && u.id !== unit.id && units.indexOf(u) < units.indexOf(unit))
      .flatMap((u) => u.wordIds)
      .filter((id) => isKnown(id) && !unit.wordIds.includes(id))
      .sort((a, b) => progress.cards[a].stability - progress.cards[b].stability)
      .slice(0, 5)
      .map(wordOf)
    out.push(...shuffle([...unitWords, ...earlier].map((w) => drill(w))))
  } else {
    // HSK / media: a test of what you've prepared — intro only for unseen (or just-missed) words, two drills each,
    // the second one deferred into the next chunk so a few minutes pass between them
    let deferred: Exercise[] = []
    const CHUNK = unitWords.length <= 6 ? 3 : 4
    for (let i = 0; i < unitWords.length; i += CHUNK) {
      const chunk = unitWords.slice(i, i + CHUNK)
      const drills: Exercise[] = [...deferred]
      deferred = []
      for (const w of chunk) {
        if (!isKnown(w.id) || missed.includes(w.id)) out.push({ kind: 'intro', word: w, options: [], tiles: [] })
        const tier = tierOf(w.id)
        const a = randomKind(w, focus, { quiet, tier })
        const b = randomKind(w, focus, { exclude: [a], quiet, tier })
        drills.push(makeExercise(a, w, pool))
        deferred.push(makeExercise(b, w, pool))
      }
      out.push(...shuffle(drills))
    }
    out.push(...shuffle(deferred))
  }
  // finish by combining: sentences that mix this unit's words with everything already known (more as you know more),
  // allowing at most one brand-new word per sentence so vocabulary sneaks in through context
  const ids = new Set(unit.wordIds)
  const n = Math.min(12, 6 + Math.floor(words.filter((w) => isKnown(w.id)).length / 40))
  const unknownCount = (s: { tokens: string[] }) => new Set(s.tokens.filter((t) => !ids.has(t) && !isKnown(t))).size
  // greedy: each pick covers as many not-yet-shown unit words as possible, so every new word is met in a sentence when one exists
  const candidates = shuffle(sentences.filter((s) => s.tokens.some((t) => ids.has(t)) && unknownCount(s) <= 1))
  const uncovered = new Set(unit.wordIds)
  const chosen: typeof candidates = []
  while (chosen.length < n && candidates.length) {
    candidates.sort((a, b) => b.tokens.filter((t) => uncovered.has(t)).length - a.tokens.filter((t) => uncovered.has(t)).length)
    const s = candidates.shift()!
    chosen.push(s)
    for (const t of s.tokens) uncovered.delete(t)
  }
  out.push(...pickSentences((s) => chosen.includes(s), n))
  return out
}

/** A missed word comes back as a different exercise kind, with fresh distractors — not the same four options again. */
export function retry(e: Exercise): Exercise {
  if (e.sentence) return { ...e, options: shuffle(e.options), tiles: shuffle(e.tiles) }
  const { focus, quiet } = progress.settings
  return makeExercise(randomKind(e.word, focus, { exclude: [e.kind], quiet, tier: tierOf(e.word.id) }), e.word, seenPool([e.word]))
}

/** Read: sentences you can understand (at most one new word), comprehension questions only — input, not a test. */
export function buildRead(): Exercise[] {
  return shuffle(readableSentences())
    .slice(0, READ_SIZE)
    .map((s) => {
      const fresh = [...new Set(s.tokens.filter((t) => !isKnown(t)))].map(wordOf)
      const ex = sentenceExercise(s, 'sentenceMeaning', wordOf)
      ex.newWords = fresh
      return ex
    })
}

/** 天劫: 20 questions from the whole realm, the 12 most-likely-forgotten words plus 8 at random. Follows the Focus setting like lessons do. */
export const TRIBULATION_SIZE = 20
export function buildTribulation(stageIndex: number): Exercise[] {
  const { focus, quiet } = progress.settings
  const all = tribulationWords(stageIndex)
  const ws = all.length <= TRIBULATION_SIZE ? all : [...all.slice(0, 12), ...shuffle(all.slice(12)).slice(0, TRIBULATION_SIZE - 12)]
  const pool = seenPool(ws)
  return shuffle(ws.map((w) => makeExercise(randomKind(w, focus, { quiet, tier: tierOf(w.id) }), w, pool)))
}

/** Weekly 试炼: the 20 known words closest to fading, graded early on purpose. */
export function buildTrial(): Exercise[] {
  const { focus, quiet } = progress.settings
  const ws = trialWords().slice(0, TRIBULATION_SIZE)
  const pool = seenPool(ws)
  return shuffle(ws.map((w) => makeExercise(randomKind(w, focus, { quiet, tier: tierOf(w.id) }), w, pool)))
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
