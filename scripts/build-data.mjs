// Generates src/data/*.json from open datasets + curated files in scripts/.
// Run: node scripts/build-data.mjs   (downloads sources into scripts/.cache on first run)
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = join(root, 'scripts/.cache')
mkdirSync(cache, { recursive: true })

const MAX_LEVEL = 4 // HSK 3.0 bands 1-4 ≈ Readibu entry level
const UNIT_SIZE = 10

async function fetchCached(name, url, binary = false) {
  const p = join(cache, name)
  if (!existsSync(p)) {
    console.log('downloading', url)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    writeFileSync(p, Buffer.from(await res.arrayBuffer()))
  }
  return binary ? readFileSync(p) : readFileSync(p, 'utf8')
}
const lines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
const stripTones = (p) => p.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s'’]/g, '').toLowerCase()
/** "xué xí" → "xuéxí"; insert apostrophe before a/o/e syllables to keep them readable (xī'ān). */
const joinPinyin = (p) => p.trim().toLowerCase().split(/\s+/).reduce((acc, s) => acc + (acc && /^[aoeāáǎàōóǒòēéěè]/.test(s) ? "'" : '') + s, '')

// ---- sources -------------------------------------------------------------
const raw = JSON.parse(await fetchCached('complete.json', 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json'))
const official = new Map() // official HSK 3.0 pinyin (ivankra/hsk30, MIT) disambiguates 行/吗/得
for (const line of lines(await fetchCached('hsk30.csv', 'https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv')).slice(1)) {
  const [, simp, , pinyin] = line.split(',')
  if (simp && !official.has(simp)) official.set(simp, stripTones(pinyin))
}
const overrides = new Map(lines(readFileSync(join(root, 'scripts/overrides.txt'), 'utf8')).map((l) => { const [h, p, g, pattern] = l.split('|'); return [h, { pinyin: p, meaning: g, pattern }] }))
// subtitle frequency share (hermitdave/FrequencyWords, OpenSubtitles zh_cn, CC BY-SA 4.0)
const subCount = new Map()
let subTotal = 0
for (const line of lines(await fetchCached('zh_cn_50k.txt', 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt'))) {
  const [w, c] = line.split(' ')
  subCount.set(w, +c)
  subTotal += +c
}

// ---- words ---------------------------------------------------------------
const junk = /^(variant of|old variant|euphemistic|erhua variant|see |CL:|surname |abbr\.|used in|used before|\(archaic\)|\(literary\)|\(old\)|[A-Z][a-z]+ \(surname\))|variant of/i
const clean = (m) => m.replace(/^\([^)]*\)\s*/, '').replace(/\s*\([^)]*\)$/, '').replace(/;?\s*also pr\..*$/, '').trim() || m.replace(/[()]/g, '').trim()
const words = []
const seen = new Set()
for (const e of raw) {
  const lv = Math.min(...e.level.filter((l) => l.startsWith('new-')).map((l) => +l.slice(4)))
  if (!(lv >= 1 && lv <= MAX_LEVEL) || seen.has(e.simplified)) continue
  const forms = e.forms
    .map((f) => ({ f, m: f.meanings.filter((m) => !junk.test(m)) }))
    .filter((x) => x.m.length)
    .sort((a, b) => /^[A-Z]/.test(a.f.transcriptions.pinyin) - /^[A-Z]/.test(b.f.transcriptions.pinyin)) // surnames/proper nouns last
  const f = forms.find((x) => stripTones(x.f.transcriptions.pinyin) === official.get(e.simplified)) ?? forms[0]
  const o = overrides.get(e.simplified)
  if (!f && !o) continue
  seen.add(e.simplified)
  // beginners get one meaning: HSK 1–2 words show only the first sense (curated overrides win); bands 3–4 keep up to three
  const senses = [...new Set(f.m.flatMap((m) => m.split(';')).map(clean).filter(Boolean))].slice(0, lv <= 2 ? 1 : 3)
  while (senses.length > 1 && senses.join('; ').length > 45) senses.pop() // keep MC options short
  const meaning = o?.meaning ?? (senses[0].length > 60 ? senses[0].slice(0, 57) + '…' : senses.join('; '))
  words.push({
    id: e.simplified,
    hanzi: e.simplified,
    pinyin: o?.pinyin ?? joinPinyin(f.f.transcriptions.pinyin),
    meaning,
    ...(o?.pattern ? { pattern: o.pattern } : {}),
    level: lv,
    pos: e.pos?.[0],
    share: +((subCount.get(e.simplified) ?? 0) / subTotal).toFixed(7),
    _freq: e.frequency ?? 1e9,
  })
}
// curated words missing from the source list (e.g. 你好) → band 1
for (const [hanzi, o] of overrides) {
  if (!seen.has(hanzi)) { words.push({ id: hanzi, hanzi, pinyin: o.pinyin, meaning: o.meaning, level: 1, share: +((subCount.get(hanzi) ?? 0) / subTotal).toFixed(7), _freq: 0 }); seen.add(hanzi) }
}
words.sort((a, b) => a.level - b.level || a._freq - b._freq)
const byHanzi = new Map(words.map((w) => [w.hanzi, w]))

// ---- units: pinned first, then band + frequency --------------------------
const units = []
const placed = new Set()
for (const l of lines(readFileSync(join(root, 'scripts/pinned-units.txt'), 'utf8'))) {
  const [title, list] = l.split('|')
  const ids = list.split(/\s+/).filter((h) => {
    if (!byHanzi.has(h)) { console.warn(`pinned word not in HSK 1-4 list: ${h}`); return false }
    if (placed.has(h)) { console.warn(`pinned twice: ${h}`); return false }
    placed.add(h)
    return true
  })
  units.push({ id: `c1-${units.length + 1}`, title: `HSK 1 · ${title}`, track: 'core', wordIds: ids })
}
for (let lv = 1; lv <= MAX_LEVEL; lv++) {
  const rest = words.filter((w) => w.level === lv && !placed.has(w.hanzi))
  const start = lv === 1 ? units.length : 0
  for (let i = 0; i < rest.length; i += UNIT_SIZE) {
    const n = start + i / UNIT_SIZE + 1
    units.push({ id: `c${lv}-${n}`, title: `HSK ${lv} · Unit ${n}`, track: 'core', wordIds: rest.slice(i, i + UNIT_SIZE).map((w) => w.id) })
  }
}

// ---- themes ---------------------------------------------------------------
for (const [ti, l] of lines(readFileSync(join(root, 'scripts/themes.txt'), 'utf8')).entries()) {
  const [name, icon, list] = l.split('|')
  const ids = list.split(/\s+/).filter((h) => byHanzi.has(h) || console.warn(`theme word not in HSK 1-4 list: ${h}`))
  const size = Math.ceil(ids.length / Math.ceil(ids.length / 7)) // balanced chunks, no 1-word leftovers
  for (let i = 0; i < ids.length; i += size) {
    const k = i / size + 1
    units.push({ id: `t${ti + 1}-${k}`, title: `${name} · ${k}`, track: 'theme', theme: name, icon, wordIds: ids.slice(i, i + size) })
  }
}

// ---- media phrases (skip anything already an HSK 1-2 word) ---------------
const media = []
let group = null
for (const line of readFileSync(join(root, 'scripts/media.txt'), 'utf8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  if (line.startsWith('==')) { group = { title: line.slice(2).trim(), ids: [] }; units.push(group); continue }
  const keep = line.startsWith('!') // genre sense of an everyday word (大人 = my lord)
  const [hanzi, pinyin, meaning] = line.replace(/^!/, '').split('|').map((s) => s.trim())
  const hsk = byHanzi.get(hanzi)
  if (hsk && hsk.level <= 2 && !keep) continue // learned in the core track anyway
  const id = hsk ? `${hanzi}~m` : hanzi
  media.push({ id, hanzi, pinyin, meaning, level: 0, share: +((subCount.get(hanzi) ?? 0) / subTotal).toFixed(7) })
  group.ids.push(id)
}
// split media groups into ≤10-word units
for (let i = units.length - 1; i >= 0; i--) {
  const g = units[i]
  if (!g.ids) continue
  const parts = []
  const size = Math.ceil(g.ids.length / Math.ceil(g.ids.length / UNIT_SIZE)) // balanced: 11 words → 6 + 5, not 10 + 1
  for (let j = 0; j < g.ids.length; j += size) parts.push(g.ids.slice(j, j + size))
  units.splice(i, 1, ...parts.map((ids, k) => ({ id: `m${i}-${k + 1}`, title: parts.length > 1 ? `${g.title} ${k + 1}` : g.title, track: 'media', wordIds: ids })))
}
const allWords = [...words, ...media]
const byId = new Map(allWords.map((w) => [w.id, w]))

// ---- sentences -----------------------------------------------------------
const wordSet = new Set(words.map((w) => w.hanzi))
const maxLen = Math.max(...words.map((w) => w.hanzi.length))
const PUNCT = /[\p{P}\s]/u
function segment(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    if (PUNCT.test(text[i])) { i++; continue }
    let found = ''
    for (let l = Math.min(maxLen, text.length - i); l >= 1; l--) {
      const s = text.slice(i, i + l)
      if (wordSet.has(s)) { found = s; break }
    }
    if (!found) return null
    out.push(found)
    i += found.length
  }
  return out
}
// CC-CEDICT headwords (CC BY-SA 4.0): reject sentences where a real dictionary word was split into HSK pieces (差别→差/别)
const cedict = new Set()
for (const line of gunzipSync(await fetchCached('cedict.txt.gz', 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz', true)).toString('utf8').split('\n')) {
  if (line.startsWith('#')) continue
  const simp = line.split(' ')[1]
  if (simp && simp.length >= 2 && !/^[A-Z]/.test(line.split('[')[1] ?? '')) cedict.add(simp)
}
const compositional = (a, b) => /^[不没]$/.test(a) || /^[一二三四五六七八九十两几]$/.test(a) && /^[一二三四五六七八九十个块点]$/.test(b) || b === '们' || a === b || /^[你我他她]$/.test(a) && /^[你我他她]$/.test(b)
function overSplit(tokens) {
  for (let i = 0; i < tokens.length - 1; i++) {
    const two = tokens[i] + tokens[i + 1]
    if (cedict.has(two) && !wordSet.has(two) && !compositional(tokens[i], tokens[i + 1])) return two
    const three = i < tokens.length - 2 ? two + tokens[i + 2] : ''
    if (three && cedict.has(three) && !wordSet.has(three)) return three
  }
  return null
}
const unitIndex = new Map(units.flatMap((u, i) => (u.track === 'theme' ? [] : u.wordIds.map((id) => [id, i]))))
const normalizePunct = (s) => s.replace(/\s+/g, '').replace(/,/g, '，').replace(/\?/g, '？').replace(/!/g, '！').replace(/\.$/, '。')
const fixes = readFileSync(join(root, 'scripts/sentence-fixes.txt'), 'utf8')
const removed = new Set(lines(fixes.split('== translate')[0]).filter((l) => !l.startsWith('==')).map(normalizePunct))
const retranslated = new Map(lines(fixes.split('== translate')[1]).map((l) => l.split('|')).map(([h, m]) => [normalizePunct(h), m]))
const sentences = []
const seenSent = new Set()
const stats = { seg: 0, split: 0, pinyin: 0, kept: 0 }
function addSentence(hanzi, meaning, srcPinyin) {
  hanzi = normalizePunct(hanzi)
  if (seenSent.has(hanzi) || removed.has(hanzi) || hanzi.length > 16) return
  if (/[。？！]./.test(hanzi)) return // sentence-final mark in the middle → two sentences
  const tokens = segment(hanzi)
  if (!tokens || tokens.length < 2 || tokens.length > 10) { stats.seg++; return }
  if (overSplit(tokens)) { stats.split++; return }
  const pinyin = tokens.map((t) => byHanzi.get(t).pinyin).join(' ')
  if (srcPinyin && stripTones(srcPinyin) !== stripTones(pinyin)) { stats.pinyin++; return } // polyphone read differently (还 huán, 得 de)
  const unlock = Math.max(...tokens.map((t) => unitIndex.get(t)))
  if (tokens.length > (unlock < 20 ? 6 : unlock < 40 ? 8 : 10)) return
  seenSent.add(hanzi)
  sentences.push({ hanzi, pinyin, meaning: retranslated.get(hanzi) ?? meaning, tokens, unlock })
  stats.kept++
}
for (const l of lines(readFileSync(join(root, 'scripts/sentences-extra.txt'), 'utf8'))) { const [h, m] = l.split('|'); addSentence(h, m) }
for (const line of (await fetchCached('sentences.tsv', 'https://raw.githubusercontent.com/Destaq/chinese-sentence-miner/master/data/sentences.tsv')).split('\n').slice(1)) {
  const [hanzi, pinyin, meaning, avg] = line.split('\t')
  if (!hanzi || +avg > 4 || /[(=;]/.test(meaning ?? '')) continue
  addSentence(hanzi, meaning, pinyin)
}
sentences.sort((a, b) => a.unlock - b.unlock || a.tokens.length - b.tokens.length)

// ---- write ---------------------------------------------------------------
const out = join(root, 'src/data')
mkdirSync(out, { recursive: true })
const strip = ({ _freq, ...w }) => w
writeFileSync(join(out, 'words.json'), JSON.stringify(allWords.map(strip)))
writeFileSync(join(out, 'units.json'), JSON.stringify(units))
writeFileSync(join(out, 'sentences.json'), JSON.stringify(sentences))
const pinnedSents = sentences.filter((s) => s.unlock < 9).length
console.log(`${units.filter((u) => u.track === 'theme').length} theme units`)
console.log(`${words.length} words, ${media.length} phrases, ${units.length} units, ${sentences.length} sentences (${pinnedSents} within pinned units; dropped: ${stats.seg} unsegmentable, ${stats.split} over-split, ${stats.pinyin} pinyin mismatch)`)
