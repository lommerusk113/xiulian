export interface Word {
  id: string
  hanzi: string
  pinyin: string
  meaning: string
  /** HSK 3.0 band 1-4, or 0 for media phrases */
  level: number
  /** part of speech tag from the HSK list (r pronoun, v verb, n noun, a adjective, …) */
  pos?: string
  /** share of running words in film/TV subtitles (0-1) */
  share: number
  /** one-line usage pattern for grammar words, e.g. "S + 吗？" */
  pattern?: string
}

export interface Unit {
  id: string
  title: string
  track: 'core' | 'media' | 'theme'
  theme?: string
  icon?: string
  wordIds: string[]
}

export interface Sentence {
  hanzi: string
  pinyin: string
  meaning: string
  tokens: string[]
  /** index into units; sentence becomes available once that unit is learned */
  unlock: number
}

export type ExerciseKind =
  | 'intro'
  | 'meaning' // hanzi → meaning
  | 'hanzi' // meaning → hanzi
  | 'audio' // audio → hanzi
  | 'pinyin' // hanzi → pinyin
  | 'audioMeaning' // audio → meaning
  | 'pinyinMeaning' // pinyin → meaning
  | 'meaningPinyin' // meaning → pinyin
  | 'audioPinyin' // audio → pinyin (tones)
  | 'tiles' // build word from character tiles
  | 'sentence' // build sentence from word tiles
  | 'sentenceMeaning' // sentence → translation

export type Focus = 'pinyin' | 'balanced' | 'hanzi'

export interface Exercise {
  kind: ExerciseKind
  word: Word
  /** answer options for choice exercises (already shuffled, includes the correct one) */
  options: string[]
  /** for tiles/sentence: shuffled pieces incl. distractors */
  tiles: string[]
  sentence?: Sentence
  /** words in the sentence the learner hasn't met yet (sneaked in through context) */
  newWords?: Word[]
}
