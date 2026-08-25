# Xiulian — design

**Goal.** Solo learner, zero Mandarin, no Chinese keyboard, phone + PC. Target: read web novels in Readibu and follow donghua/manhua. No daily cap.

**Research conclusions (drive the design).**
- Readibu entry ≈ HSK 3.0 band 3–4 (~1,200 chars / 3,000 words); novels ≈ band 5–6. Curriculum therefore covers bands 1–4 (3,178 words) and then hands over to real reading.
- Recognition only — no handwriting or typing (user has no Chinese keyboard; reading is the goal). FSRS scheduling. Tones from day one. Frequency-first within bands.
- No open donghua/xianxia frequency list exists → hand-curated 111-phrase media track.

**Stack.** Vite + Vue 3 + TS, Nuxt UI 4 (plain-Vue mode, Tailwind v4, Reka UI), vue-router (hash), ts-fsrs, vite-plugin-pwa. Backend: see `2026-08-25-backend-sync-design.md` (accounts + sync; `localStorage` stays as offline cache).

**Review loop (2026-08-25).** Lessons exported as text and evaluated by a 12-agent workflow (3 research, 4 simulated beginners, 4 Chinese experts, 1 synthesis). Applied: curated glosses, survival-first pinned units, distractor constraints, media deck rewrite (214 phrases), sentence pipeline hardening, audio→meaning / pinyin-centric / sentence-comprehension exercises, Sounds primer, subtitle-coverage meter, HSK rank with sub-steps. Deferred: cloze, component-pick, daily soft caps (user wants none), "already know this" fast path.

**User additions.** No handwriting (removed). Focus setting (pinyin default). Sentence Builder tab with rule-based validation (`grammar.ts`) + corpus match.

**Data pipeline** (`scripts/build-data.mjs`, generated output committed):
complete-hsk-vocabulary + hsk30.csv (official pinyin disambiguates 行/吗) + `overrides.txt` → `words.json` (with subtitle `share`); pinned units then band+frequency → `units.json`; media.txt → media units (HSK 1–2 duplicates dropped); hand-written micro-sentences + Tatoeba/Destaq sentences greedily segmented against the word list, rejected if any CC-CEDICT compound was split, if source pinyin disagrees with the tokens' pinyin, or if too long for their unlock unit → `sentences.json`.

**Modules.**
- `store.ts` — reactive progress (FSRS cards, review history, settings), persistence, derived stats (due, streak, next unit).
- `exercises.ts` — builds one exercise from a word + pool of seen words; distractors match length/POS, never share a gloss word and never share a (tone-insensitive) pronunciation with the answer — 他/她/它 are all tā, so any option set holding two of them is a coin flip; the rules hold even when the seen pool is too thin to satisfy them (it falls back to the full word list). `homophones()` returns the already-learned words that sound identical, shown on the intro card and under the answer so the contrast is taught rather than guessed. Kind weights per focus.
- `grammar.ts` — corpus match + rule-based beginner grammar check for the Builder.
- `session.ts` — queues: *learn* (intro + 2 drills per new word in chunks of 4, + up to 3 sentences), *review* (20 due words, random exercise each, + sentences). Missed word → retried with a different kind; graded once (first attempt).
- `pages/` Home (due, next unit, rank, coverage, Readibu progress), Learn, Session, Words, Builder, Sounds, Settings.
- `components/` Intro, Choice (keys 1–4), Tiles (word/sentence ordering), Speak.

**Not built (deliberate).** Custom TTS, pronunciation grading, grammar notes, stats charts, HSK 5–6 (reading real text is the better tool there).

**Verification.** `npm run build` (vue-tsc + vite), `scripts/smoke.mjs` drives a full lesson in headless Chrome at 390 px and fails on console errors or unsaved progress.
