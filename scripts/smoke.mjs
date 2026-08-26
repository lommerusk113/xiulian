// Smoke test: drives a whole lesson in headless Chrome over CDP and fails on any runtime error.
// Usage: node scripts/smoke.mjs [url]   (default http://localhost:5199)
import { spawn } from 'node:child_process'
import { writeFileSync, rmSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5199'
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const port = 9333
rmSync('/tmp/xiulian-smoke', { recursive: true, force: true }) // fresh profile: no service worker from a previous build
const proc = spawn(chrome, [`--remote-debugging-port=${port}`, '--headless=new', '--disable-gpu', '--user-data-dir=/tmp/xiulian-smoke', 'about:blank'], { stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

const { webSocketDebuggerUrl } = await (await fetch(`http://localhost:${port}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const errors = []
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data)
  if (m.id) pending.get(m.id)?.(m.result ?? m.error)
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
}
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value
const shot = async (name) => writeFileSync(`${process.env.SHOTS ?? '/tmp'}/${name}.png`, Buffer.from((await send('Page.captureScreenshot')).data, 'base64'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
// fresh account per run; the token goes into localStorage the same way Login.vue stores it
const { token } = await (await fetch(`${url}/api/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `smoke-${Date.now()}@x.no`, password: 'password1' }) })).json()
if (!token) throw new Error('signup failed')
await send('Page.navigate', { url: `${url}/#/login` })
await sleep(800)
await evaluate(`localStorage.clear(); localStorage.setItem('xiulian.token', '${token}')`)
await send('Page.navigate', { url: `${url}/#/` })
await send('Page.reload') // hash-only navigation keeps the page; sync starts on boot with the token present
await sleep(800)
await sleep(1500)
await shot('home')
await send('Page.navigate', { url: `${url}/#/session/learn/c1-1` })
await sleep(1200)

let steps = 0
let shots = 0
let restarts = 0
while (steps++ < 200) {
  if (restarts >= 3) break // strict HSK lesson + random answers never ends; enough to prove the restart path works
  const finished = await evaluate(`!!document.querySelector('h1')?.textContent.match(/done/)`)
  if (finished) break
  const text = await evaluate(`document.querySelector('h2')?.textContent ?? ''`)
  // intro card
  if (await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Got it')`)) {
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Got it').click()`)
    await sleep(150); continue
  }
  if (await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue')`)) {
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continue').click()`)
    await sleep(150); continue
  }
  if (await evaluate(`[...document.querySelectorAll('button')].some(b => /restart lesson/i.test(b.textContent))`)) {
    restarts++
    await evaluate(`[...document.querySelectorAll('button')].find(b => /restart lesson/i.test(b.textContent)).click()`)
    await sleep(150); continue
  }
  if (shots < 4 && text) { await shot(`ex-${shots++}`) }
  if (/Build/.test(text)) {
    // tap all tiles then Check
    await evaluate(`(async () => { const tiles = () => [...document.querySelectorAll('.hanzi.bg-elevated')]; while (tiles().length) { tiles()[0].click(); await new Promise(r => setTimeout(r, 30)) } })()`)
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')?.click()`)
  } else {
    // multiple choice: pick the first option
    await evaluate(`document.querySelector('.grid button')?.click()`)
  }
  await sleep(200)
}
await shot('done')

// Builder: 我 是 人 → Check → must be recognised as a real sentence (in the corpus)
await send('Page.navigate', { url: `${url}/#/build` })
await sleep(1200)
await evaluate(`(() => { const t = [...document.querySelectorAll('[role=tab]')].find(b => b.textContent.trim() === 'HSK 1'); t.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 })); t.click() })()`)
await sleep(300)
for (const [cat, py] of [['Pronouns', 'wǒ'], ['Verbs', 'shì'], ['Nouns', 'rén']]) {
  await evaluate(`[...document.querySelectorAll('section > button')].find(b => b.textContent.trim().startsWith('${cat}'))?.click()`)
  await sleep(150)
  const ok = await evaluate(`(() => { const b = [...document.querySelectorAll('section button span:first-child')].find(s => s.textContent.trim() === '${py}'); if (!b) return false; b.closest('button').click(); return true })()`)
  if (!ok) errors.push(`builder: could not find word ${py} in ${cat}`)
}
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')?.click()`)
await sleep(300)
const verdict = await evaluate(`document.body.innerText.match(/real sentence|looks fine|check these/i)?.[0] ?? 'none'`)
if (!/real sentence/i.test(verdict)) errors.push(`builder verdict for 我是人 was "${verdict}", expected a real-sentence match`)
await shot('build')
await send('Page.navigate', { url: `${url}/#/sounds` })
await sleep(1000)
await shot('sounds')
await send('Page.navigate', { url: `${url}/#/learn` })
await sleep(1000)
await shot('learn')
// theme lesson renders and is repetition-heavy (6 words → ≥ 18 exercises even if some are already known)
await send('Page.navigate', { url: `${url}/#/session/learn/t1-1` })
await sleep(1200)
const themeTotal = +(await evaluate(`document.querySelector('header span')?.textContent.split('/')[1] ?? 0`))
if (themeTotal < 18) errors.push(`theme lesson has only ${themeTotal} exercises`)
await shot('theme')
for (let i = 0; i < 300 && !(await evaluate(`/done/.test(document.querySelector('h1')?.textContent ?? '')`)); i++) {
  const btn = await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(b => ['Got it', 'Continue'].includes(b.textContent.trim())); if (b) { b.click(); return true } return false })()`)
  if (!btn) {
    if (await evaluate(`!!document.querySelector('.grid button')`)) await evaluate(`document.querySelector('.grid button').click()`)
    else { await evaluate(`(async () => { const t = () => [...document.querySelectorAll('.hanzi.bg-elevated')]; while (t().length) { t()[0].click(); await new Promise(r => setTimeout(r, 20)) } })()`); await sleep(200); await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Check')?.click()`) }
  }
  await sleep(100)
}
// daily challenge: fixed 10 exercises, attempts recorded, cards untouched
await send('Page.navigate', { url: `${url}/#/session/challenge` })
await sleep(1200)
const chTotal = +(await evaluate(`document.querySelector('header span')?.textContent.split('/')[1] ?? 0`))
if (chTotal !== 10) errors.push(`challenge has ${chTotal} exercises, expected 10`)
const cardsBefore = await evaluate(`Object.keys(JSON.parse(localStorage.getItem('xiulian.v1')).cards).length`)
for (let i = 0; i < 40 && !(await evaluate(`/\\d+ \\/ \\d+/.test(document.querySelector('h1')?.textContent ?? '')`)); i++) {
  if (await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue')`)) {
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Continue').click()`)
  } else {
    await evaluate(`document.querySelector('.grid button')?.click()`)
  }
  await sleep(120)
}
const ch = await evaluate(`JSON.stringify(Object.values(JSON.parse(localStorage.getItem('xiulian.v1')).challenges)[0]?.attempts ?? null)`)
const cardsAfter = await evaluate(`Object.keys(JSON.parse(localStorage.getItem('xiulian.v1')).cards).length`)
if (!ch || JSON.parse(ch).length !== 1) errors.push(`challenge attempt not recorded: ${ch}`)
if (cardsAfter !== cardsBefore) errors.push(`challenge changed scheduling cards (${cardsBefore} → ${cardsAfter})`)
await shot('challenge')

// tribulation for 炼气一层 (stage 11) draws from every started HSK 1 word: renders, has questions
await send('Page.navigate', { url: `${url}/#/session/tribulation/11` })
await sleep(1200)
const tribTotal = +(await evaluate(`document.querySelector('header span')?.textContent.split('/')[1] ?? 0`))
if (!(tribTotal > 0 && tribTotal <= 20)) errors.push(`tribulation has ${tribTotal} questions`)
if (!(await evaluate(`document.body.innerText.includes('天劫')`))) errors.push('tribulation header missing')
await shot('tribulation')

// lesson strength recorded for the completed unit, decays as specified
const lessonRaw = await evaluate(`JSON.stringify(JSON.parse(localStorage.getItem('xiulian.v1') ?? '{}').lessons?.['t1-1'] ?? null)`)
const lesson = lessonRaw === undefined ? null : JSON.parse(lessonRaw)
if (!lesson || lesson.n !== 1 || lesson.p !== 100) errors.push(`lesson strength not recorded: ${JSON.stringify(lesson)}`)

const saved = await evaluate(`Object.keys(JSON.parse(localStorage.getItem('xiulian.v1')).cards).length`)
// sync: within a few seconds of the last change the account must hold the same cards
let remote, remoteCards
for (let i = 0; i < 16; i++) {
  await sleep(500)
  remote = await (await fetch(`${url}/api/me/progress`, { headers: { authorization: `Bearer ${token}` } })).json()
  remoteCards = Object.keys(remote.cards ?? {}).length
  if (remoteCards === saved && remote.lessons?.['t1-1']) break
}
if (remoteCards !== saved) errors.push(`account has ${remoteCards} cards, device has ${saved}`)
if (remote.lessons?.['t1-1']?.n !== 1) errors.push(`lesson strength not synced: ${JSON.stringify(remote.lessons)}`)
if (remote.history?.length < saved) errors.push(`history not synced: ${remote.history?.length}`)
console.log(`steps=${steps} restarts=${restarts} savedCards=${saved} remoteCards=${remoteCards} errors=${errors.length}`)
for (const e of errors) console.log('ERROR:', e)
ws.close()
proc.kill()
process.exit(errors.length || saved < 3 ? 1 : 0)
