import type { Exercise, ExerciseKind, Focus, Sentence, Word } from './types'
import { words, sentences } from './data'

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const stripTones = (p: string) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'’]/g, '').toLowerCase()
const syllables = (w: Word) => [...w.hanzi].length
const STOP = new Set(['to', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'be', 'is', 'it', 'up', 'sb', 'sth'])
const glossTokens = (m: string) => new Set(m.split(';')[0].toLowerCase().match(/[a-z']+/g)?.filter((t) => t.length > 2 && !STOP.has(t)) ?? [])
const overlaps = (a: Word, b: Word) => {
  const ta = glossTokens(a.meaning)
  for (const t of glossTokens(b.meaning)) if (ta.has(t)) return true
  return false
}

type Key = 'meaning' | 'hanzi' | 'pinyin'

/**
 * Pick n distractors. Pool = words the learner has seen (+ current unit), preferring the same length and POS,
 * so exercises can't be solved by elimination. Options never share a gloss word with the answer, and
 * audio/pinyin options never share a (tone-insensitive) pronunciation.
 */
function distractors(word: Word, n: number, key: Key, pool: Word[], opts: { distinctSound?: boolean; toneVariants?: number } = {}) {
  const chosen: Word[] = []
  const used = new Set<string>([word[key]])
  const sounds = new Set<string>([stripTones(word.pinyin)])
  const accept = (w: Word, strict: boolean) => {
    if (w.id === word.id || used.has(w[key])) return false
    if (w.hanzi === word.hanzi) return false
    if (opts.distinctSound && sounds.has(stripTones(w.pinyin))) return false
    if (strict && overlaps(w, word)) return false
    return true
  }
  const take = (w: Word) => {
    chosen.push(w)
    used.add(w[key])
    sounds.add(stripTones(w.pinyin))
  }
  // optional same-syllable/different-tone variants (tone training)
  if (opts.toneVariants) {
    const base = stripTones(word.pinyin)
    for (const w of shuffle(words.filter((w) => stripTones(w.pinyin) === base && w.pinyin !== word.pinyin))) {
      if (chosen.length >= opts.toneVariants) break
      if (w.id !== word.id && !used.has(w[key])) take(w)
    }
  }
  const score = (w: Word) => (syllables(w) === syllables(word) ? 2 : 0) + (w.pos && w.pos === word.pos ? 1 : 0) + Math.random()
  const ranked = [...pool].sort((a, b) => score(b) - score(a))
  for (const strict of [true, false]) {
    for (const w of ranked) {
      if (chosen.length >= n) break
      if (accept(w, strict)) take(w)
    }
    if (chosen.length >= n) break
  }
  if (chosen.length < n) {
    for (const w of shuffle(words)) {
      if (chosen.length >= n) break
      if (accept(w, false) && syllables(w) === syllables(word)) take(w)
    }
  }
  for (const w of shuffle(words)) {
    if (chosen.length >= n) break
    if (accept(w, false)) take(w)
  }
  return chosen
}

export function makeExercise(kind: ExerciseKind, word: Word, pool: Word[]): Exercise {
  const ex: Exercise = { kind, word, options: [], tiles: [] }
  const opt = (key: Key, ds: Word[]) => shuffle([word, ...ds].map((w) => w[key]))
  switch (kind) {
    case 'meaning':
    case 'audioMeaning':
    case 'pinyinMeaning':
      ex.options = opt('meaning', distractors(word, 3, 'meaning', pool, { distinctSound: kind !== 'meaning' }))
      break
    case 'hanzi':
      ex.options = opt('hanzi', distractors(word, 3, 'hanzi', pool))
      break
    case 'audio':
      ex.options = opt('hanzi', distractors(word, 3, 'hanzi', pool, { distinctSound: true }))
      break
    case 'pinyin':
      ex.options = opt('pinyin', distractors(word, 3, 'pinyin', pool, { toneVariants: 1 }))
      break
    case 'meaningPinyin':
      ex.options = opt('pinyin', distractors(word, 3, 'pinyin', pool))
      break
    case 'audioPinyin':
      ex.options = opt('pinyin', distractors(word, 3, 'pinyin', pool, { toneVariants: 2 }))
      break
    case 'tiles': {
      const chars = [...word.hanzi]
      const extra = shuffle(pool.length ? pool : words).flatMap((w) => [...w.hanzi]).filter((c) => !chars.includes(c))
      ex.tiles = shuffle([...chars, ...extra.slice(0, Math.min(3, Math.max(2, chars.length)))])
      break
    }
  }
  return ex
}

export function sentenceExercise(s: Sentence, kind: 'sentence' | 'sentenceMeaning', wordOf: (id: string) => Word): Exercise {
  const ex: Exercise = { kind, word: wordOf(s.tokens[0]), options: [], tiles: shuffle(s.tokens), sentence: s }
  if (kind === 'sentenceMeaning') {
    const others = shuffle(sentences.filter((o) => o.meaning !== s.meaning && Math.abs(o.tokens.length - s.tokens.length) <= 2)).slice(0, 3)
    ex.options = shuffle([s.meaning, ...others.map((o) => o.meaning)])
  }
  return ex
}

/** How often each exercise kind appears, per focus. Recognition-only — no typing, no handwriting. */
const WEIGHTS: Record<Focus, Partial<Record<ExerciseKind, number>>> = {
  pinyin: { pinyinMeaning: 25, meaningPinyin: 20, audioPinyin: 20, audioMeaning: 15, meaning: 10, pinyin: 10 },
  balanced: { meaning: 20, audioMeaning: 20, hanzi: 15, audio: 10, pinyin: 10, pinyinMeaning: 10, meaningPinyin: 5, audioPinyin: 5, tiles: 5 },
  hanzi: { meaning: 30, hanzi: 20, audio: 20, audioMeaning: 10, tiles: 10, pinyin: 10 },
}
/**
 * Difficulty tier per kind. 0 = guess the meaning (all a beginner should face), 1 = produce the form,
 * 2 = tone-precise pinyin from the character. A word unlocks tiers as its FSRS card matures.
 */
export const TIER: Record<ExerciseKind, number> = {
  intro: 0, meaning: 0, pinyinMeaning: 0, audioMeaning: 0,
  hanzi: 1, meaningPinyin: 1, audio: 1, tiles: 1, sentence: 1, sentenceMeaning: 1,
  pinyin: 2, audioPinyin: 2,
}

export function kindsFor(word: Word, focus: Focus, quiet = false, tier = 2): ExerciseKind[] {
  let kinds = (Object.keys(WEIGHTS[focus]) as ExerciseKind[]).filter((k) => TIER[k] <= tier)
  if (quiet) kinds = kinds.filter((k) => !k.startsWith('audio'))
  if (!kinds.length) kinds = ['meaning', 'pinyinMeaning']
  if ([...word.hanzi].length < 2) kinds = kinds.filter((k) => k !== 'tiles')
  // ponytail: media phrases use rare characters — recognition only, no tile building or tone drills
  if (word.level === 0) kinds = kinds.filter((k) => !['tiles', 'pinyin', 'audioPinyin'].includes(k))
  return kinds
}

export function randomKind(word: Word, focus: Focus, opts: { exclude?: ExerciseKind[]; quiet?: boolean; tier?: number } = {}): ExerciseKind {
  const all = kindsFor(word, focus, opts.quiet, opts.tier)
  let kinds = all.filter((k) => !opts.exclude?.includes(k))
  if (!kinds.length) kinds = all
  const total = kinds.reduce((s, k) => s + (WEIGHTS[focus][k] ?? 1), 0)
  let r = Math.random() * total
  for (const k of kinds) {
    r -= WEIGHTS[focus][k] ?? 1
    if (r <= 0) return k
  }
  return kinds[kinds.length - 1]
}
