// Dumps lesson content (no UI) for review by humans/agents: node scripts/export-lessons.mjs > lessons.txt
import { readFileSync } from 'node:fs'
const words = JSON.parse(readFileSync('src/data/words.json', 'utf8'))
const units = JSON.parse(readFileSync('src/data/units.json', 'utf8'))
const sentences = JSON.parse(readFileSync('src/data/sentences.json', 'utf8'))
const byId = new Map(words.map((w) => [w.id, w]))
const rnd = (a) => a[Math.floor(Math.random() * a.length)]
const stripTones = (p) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const N = +(process.argv[2] ?? 12)
console.log(`# Xiulian lessons export — first ${N} HSK-1 units, all media units, sample exercises, sentences\n`)
console.log(`## Rules\n- 10 words per unit, ordered by HSK 3.0 band then subtitle frequency; particles/adverbs pushed back in band 1.\n- A word is "known" when FSRS stability >= 21 days. HSK rank N is earned when 90% of band N words are known.\n- Exercises: char->meaning, meaning->char, audio->char, char->pinyin (4 options), build word from tiles, build sentence from word tiles. No handwriting/typing.\n`)
for (const u of units.filter((u) => u.track === 'core').slice(0, N)) {
  console.log(`\n## ${u.title}`)
  for (const id of u.wordIds) { const w = byId.get(id); console.log(`- ${w.hanzi}  ${w.pinyin}  — ${w.meaning}${w.pos ? `  [${w.pos}]` : ''}`) }
}
console.log('\n## Sample multiple-choice exercises (correct answer marked *)')
const pool = units.filter((u) => u.track === 'core').slice(0, N).flatMap((u) => u.wordIds.map((id) => byId.get(id)))
for (let i = 0; i < 30; i++) {
  const w = rnd(pool)
  const kind = rnd(['meaning', 'hanzi', 'pinyin'])
  const key = kind === 'meaning' ? 'meaning' : kind === 'hanzi' ? 'hanzi' : 'pinyin'
  let cands = pool.filter((x) => x.id !== w.id && x[key] !== w[key])
  if (kind === 'pinyin') { const same = words.filter((x) => x.id !== w.id && stripTones(x.pinyin) === stripTones(w.pinyin) && x.pinyin !== w.pinyin); cands = [...same, ...cands] }
  const opts = [w, ...[...new Set(cands)].slice(0, 3)].sort(() => Math.random() - 0.5)
  const prompt = kind === 'meaning' ? `What does ${w.hanzi} mean?` : kind === 'hanzi' ? `Which is "${w.meaning}"?` : `Pinyin of ${w.hanzi}?`
  console.log(`${i + 1}. ${prompt}  →  ${opts.map((o) => (o.id === w.id ? '*' : '') + o[key]).join(' | ')}`)
}
console.log('\n## Media / donghua units')
for (const u of units.filter((u) => u.track === 'media')) {
  console.log(`\n### ${u.title}`)
  for (const id of u.wordIds) { const w = byId.get(id); console.log(`- ${w.hanzi}  ${w.pinyin}  — ${w.meaning}`) }
}
console.log('\n## First 80 sentences (with word segmentation used for tile exercises; unlock = unit index)')
for (const s of sentences.slice(0, 80)) console.log(`- ${s.hanzi}  |  ${s.pinyin}  |  ${s.meaning}  |  tokens: ${s.tokens.join(' / ')}  |  unlock ${s.unlock}`)
