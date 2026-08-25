import type { Word, Unit, Sentence } from './types'
import wordsJson from './data/words.json'
import unitsJson from './data/units.json'
import sentencesJson from './data/sentences.json'

export const words = wordsJson as Word[]
export const units = unitsJson as Unit[]
export const sentences = sentencesJson as Sentence[]
