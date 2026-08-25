// ponytail: rule-based sanity check for beginner sentences — catches the classic mistakes, not a real parser.
import type { Word } from './types'
import { sentences } from './data'

export interface Check {
  status: 'real' | 'ok' | 'issues'
  issues: string[]
  /** matched corpus sentence, if any */
  known?: { meaning: string }
}

const QUESTION = new Set(['谁', '什么', '哪', '哪儿', '哪里', '怎么', '怎么样', '为什么', '多少', '几'])
const FINAL = new Set(['吗', '呢', '吧'])
const ADVERBS = new Set(['很', '也', '都', '不', '没', '就', '太', '还', '再', '真', '最'])
const PSYCH_VERBS = new Set(['喜欢', '想', '爱', '会', '能', '知道', '希望', '怕'])
const PREPOSITIONS = new Set(['在', '从', '跟', '给', '和', '对', '向', '把', '被'])
const SELF_MEASURE = new Set(['天', '年', '点', '岁', '号', '月', '块', '分', '次', '小时', '星期', '个', '本', '只', '件', '张', '口', '位', '些'])
const norm = (s: string) => s.replace(/[\p{P}\s]/gu, '')
const corpus = new Map(sentences.map((s) => [norm(s.hanzi), s]))

const isVerb = (w: Word) => !!w.pos && /^v/.test(w.pos) && !PREPOSITIONS.has(w.hanzi)
const isAdj = (w: Word) => !!w.pos && /^a/.test(w.pos)
const isNoun = (w: Word) => !!w.pos && /^(n|r|s|t)/.test(w.pos)
const isNumber = (w: Word) => !!w.pos && /^m/.test(w.pos)
const isMeasure = (w: Word) => !!w.pos && /^q/.test(w.pos)
const isTime = (w: Word) => w.pos === 't'

export function check(tokens: Word[]): Check {
  const issues: string[] = []
  const h = tokens.map((t) => t.hanzi)
  const joined = h.join('')
  const known = corpus.get(joined)
  if (known) return { status: 'real', issues: [], known }
  if (tokens.length < 2) return { status: 'issues', issues: ['Add at least two words.'] }

  h.forEach((t, i) => {
    if (FINAL.has(t) && i !== h.length - 1) issues.push(`${t} goes at the very end of the sentence.`)
  })
  if (h.includes('吗') && h.some((t) => QUESTION.has(t))) issues.push('Don’t use 吗 together with a question word (什么, 谁, 哪儿…) — one or the other.')
  if (!tokens.some((t) => isVerb(t) || isAdj(t))) issues.push('No verb or adjective — add one (是, 有, 要, 去, 好…).')
  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i], b = tokens[i + 1]
    if (a.hanzi === '是' && isAdj(b)) issues.push(`Use 很 + adjective, not 是: 我很${b.hanzi}.`)
    if (a.hanzi === '不' && b.hanzi === '有') issues.push('Negate 有 with 没: 没有.')
    if (a.hanzi === '不' && isNoun(b) && !isTime(b)) issues.push(`不 goes before a verb or adjective, not before ${b.hanzi}.`)
    if (a.hanzi === '二' && isMeasure(b)) issues.push('Before a measure word use 两, not 二: 两个.')
    if (isNumber(a) && isNoun(b) && !SELF_MEASURE.has(b.hanzi) && !isTime(b) && !/[一二三四五六七八九十两]/.test(b.hanzi))
      issues.push(`Numbers need a measure word before a noun: ${a.hanzi}个${b.hanzi}.`)
    if (a.hanzi === '很' && isVerb(b) && !PSYCH_VERBS.has(b.hanzi)) issues.push('很 usually goes with adjectives (很好) or feelings (很喜欢), not action verbs.')
    if (PREPOSITIONS.has(a.hanzi) && !isNoun(b) && !QUESTION.has(b.hanzi) && b.hanzi !== '这里' && b.hanzi !== '那里')
      issues.push(`${a.hanzi} needs a noun or pronoun after it (${a.hanzi}家, ${a.hanzi}我).`)
  }
  const last = tokens[tokens.length - 1]
  if (ADVERBS.has(last.hanzi) && !(last.hanzi === '好' )) issues.push(`${last.hanzi} can’t end a sentence — put it before the verb or adjective.`)
  const firstVerb = tokens.findIndex(isVerb)
  const timeAfter = tokens.findIndex((t, i) => isTime(t) && firstVerb >= 0 && i > firstVerb && i === tokens.length - 1)
  if (timeAfter > 0) issues.push(`Time words go before the verb: ${h.filter((_, i) => i !== timeAfter).slice(0, 1).join('')}${tokens[timeAfter].hanzi}…`)

  return { status: issues.length ? 'issues' : 'ok', issues: [...new Set(issues)] }
}
