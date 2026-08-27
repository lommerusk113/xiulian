# Xiulian 修炼

*Xiūliàn* — to cultivate. Progress is a cultivation ladder of 33 stages: 凡人 Mortal → 聚气 Qi Building 1–10 (HSK 1 units completed, one stage per ~5) → 炼气 Qi Refining 1–10 (HSK 1 words known, once every HSK 1 unit is done) → the great realms 筑基 Foundation, 金丹 Golden Core, 元婴 Nascent Soul, each 初期 early / 中期 mid / 后期 late / 圆满 peak at 10/40/70/90% of HSK 2/3/4 known, in order — slower, as cultivation should be. Stages are held strictly in order and re-checked live: a word is known only while FSRS still gives it a ≥ 70% chance of recall, so neglected words fade out of known and the rank falls with them. Meeting the next stage's requirement unlocks its rite — a 突破 breakthrough for 层 steps, a 天劫 heavenly tribulation at the gates of the great realms: 20 questions (in your Focus, like lessons) from everything in the realm (the 12 words you're most likely to have forgotten plus 8 at random), four hearts; pass it to hold the stage. One breakthrough a day; fail and you must repeat a lesson — the result screen points at the units holding the words you missed — before facing it again. Every week a 试炼 trial offers the 20 known words closest to fading — right keeps them known, wrong drops them back into learning. Correct answers on words that aren't due yet never reschedule them (only the weekly trial may), so redoing lessons can't fake retention. Home shows the current stage, one bar to the next (or the waiting tribulation), and the whole path. A keyboard-free Mandarin (simplified) learning app for going from zero to reading web novels in [Readibu](https://readibu.com) and following donghua / manhua. Vue 3 · TypeScript · Tailwind v4 · Nuxt UI 4 · ts-fsrs. Works as an installable PWA on phone and desktop. Progress syncs to an account (Micronaut + Postgres, see below) and is cached in the browser for offline use.

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/ — deploy anywhere static (GitHub Pages, Netlify, …)
node scripts/build-data.mjs   # regenerate src/data/*.json from the open datasets (optional)
node scripts/smoke.mjs        # headless-Chrome smoke test: plays a whole lesson, fails on console errors
```

## How learning works

No daily cap. Learn as many units as you like; reviews are scheduled by [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) (the algorithm Anki switched to — ~20–30 % fewer reviews than SM-2 for the same retention). Every answer is either right (Good) or wrong (Again); wrong words come back later in the same session with a different exercise.

**Quiet mode** (Home/Settings) drops listening exercises and autoplay so you can drill between sets without sound; tapping a speaker still plays. Set **Focus** in Settings: *Pinyin* (default — sounds and tones first, characters shown alongside), *Balanced*, or *Characters*. **Sounds & tones** (tones, minimal sets, tricky initials, a tone drill) is optional — do it when you have headphones.

Three tracks:

- **Themes** — pronouns, core verbs, food & drink, people & places, time, numbers, adjectives. Each theme is split into ~5-word lessons that teach rather than test: every word gets its info card, a drill, the card again, a second drill (in chunks of three), then a third drill and a full second pass that also revisits the weakest words from the theme's earlier lessons; a miss brings the card back before the retry. Every lesson ends by combining: sentences that mix the lesson's words with everything you already know — more of them as your vocabulary grows — and each may sneak in one word you haven't met yet (as a comprehension question, with the new word called out afterwards).

- **HSK core** — the HSK 3.0 word list, bands 1–4 (3,178 words, ~1,200 characters), 10 words per unit. The first nine units are hand-pinned around what you can *say* (hello/thanks → who are you → this/that → want/can/know → numbers → how much → where/when → doing/liking → people/going); after that, band then subtitle frequency. Band 4 is roughly where learners report Readibu's easiest stories become readable with a pop-up dictionary; real web novels are band 5–6, where reading itself takes over from flashcards.
- **Donghua & manhua** — 214 recurring phrases from xianxia / wuxia shows and comics, reviewed by native-speaker agents: reactions (算了, 真的假的, 厉害), shouting (住手! 站住! 饶命!), address (师父, 前辈, 大人, 陛下), cultivation terms (灵气, 突破, 金丹…), plus show-specific deep cuts. Anything that is already an HSK 1–2 word lives in the core track instead.

**Daily challenge.** Ten recognition exercises fixed for the day (seeded by date), drawn mostly from your *next* unit plus your weakest recent words — hard before the day's lesson, doable after. Unlimited attempts, no effect on scheduling; the result screen lines up today's attempts and Home keeps a 7-day best-score strip, so the gap between the morning try and the evening try is your visible progress.

**Rings.** Every completion of a lesson adds one whole ring (×1, ×2, … each its own colour); rings are only ever lost whole. Themes: a ring fades every day at first, every 2 days after 1–5 completions, every 5 after 8, never after 10 — stack completions to bank days off. HSK: only your furthest completed unit fades, one ring per missed day; the units behind it freeze. HSK core units unlock in order — finish one to open the next. Repeating a lesson drills every word, not just the new ones.

**Ranks.** A word is *known* when FSRS predicts you'll remember it for 21+ days (Anki's "mature" line). Known words keep coming back, just rarely. You earn HSK rank N when 90% of band N is known. Home also shows a **subtitle coverage** meter — the share of all words spoken in film/TV subtitles that you've met.

**Sentence builder** (Build tab): tap words from your bank (pronouns, verbs, nouns, question words…) to compose a sentence, shown in both pinyin and characters, hear it, and check it. Exact matches against the 690-sentence corpus are confirmed as real; otherwise a rule-based check catches the classic beginner mistakes (吗 not at the end, 是 + adjective, 不有, missing measure word, 二 vs 两, adverb placement…). It is not a full grammar checker.

Exercises (all touch/mouse only):

| Exercise | Trains |
|---|---|
| New word card | character + pinyin + meaning + audio, plus an example sentence built only from words you already know |
| Pinyin → meaning · meaning → pinyin · audio → pinyin | sound-first recognition and tones (pinyin focus) |
| Character → meaning | reading |
| Meaning → character | recognition among look-alikes (never among homophones — the meaning has to pick one out) |
| Audio → character | listening (device TTS) |
| Character → pinyin | tones — distractors are the same syllable with other tones when possible |
| Build the word | multi-character words from scrambled tiles |
| Build the sentence · sentence → meaning | word order and comprehension with Tatoeba sentences, unlocked when every word in them is known |

## Why this approach (research summary)

- Reading is a recognition skill; production (handwriting, typing) isn't needed for it, so the app is recognition-only. (Hacking Chinese, Refold Mandarin)
- Coverage is Zipfian: 500 characters ≈ 75–79 % of running text, 1,000 ≈ 90 %, 1,500 ≈ 95 %, 2,000 ≈ 97 %. But meaning lives in words, and comfortable fiction reading needs ~98 % *word* coverage — thousands of words — so switch to reading real text with a pop-up dictionary (Readibu) as early as it's tolerable (~90 % comprehension) rather than waiting.
- Learn tones as part of every word from day one; introduce characters immediately, not after weeks of pinyin.
- Frequency-first ordering within HSK bands gets the highest-yield words first. Function words (的, 了, 吗…) are pushed a few units back so the first lessons are concrete.
- FSRS over SM-2: fewer reviews at equal retention, and no artificial daily limits.

New words only get "guess the meaning" exercises (pinyin/character/audio → meaning). Producing the form (meaning → character/pinyin, tiles) unlocks once the word is in review; building a whole sentence from tiles only appears in reviews, for sentences whose words are all a week-plus stable — you understand a sentence before you are asked to build it; and tone-precise pinyin-from-character only after about a week of stability — and never under Pinyin focus, where reading a bare character is left to the later Characters track. In theme and donghua lessons a missed question goes to the back of the pile and comes around again (up to three times; the intro card returns before the third try). **HSK core lessons are strict:** four hearts; the fourth miss restarts the lesson, so finishing one means you know the words (a miss on a sentence that smuggled in a brand-new word costs nothing). Breakthroughs and tribulations give four hearts too.

Distractors are drawn from words you've already met, matched on length and part of speech, never sharing a gloss word with the answer and never sharing a pronunciation with it either — so exercises can't be solved by elimination, and no question can be settled only by guessing. 他 她 它 are all *tā*: putting two of them in the same option set would be a coin flip whatever the question shows, so they never meet there. Homophones you've already learned are shown side by side on the new-word card and named again under the answer instead, and the glosses of the ones that share a translation say which is which (他们 "they (men or mixed group)" vs 她们 "they (women)" vs 它们 "they (things or animals)").

Suggested path: HSK 1 / theme units (Sounds & tones whenever you have headphones) → start the media track alongside → at ~HSK 2–3 open Readibu's easiest children's stories/short stories and keep the app for reviews → watch donghua with Chinese subtitles once the media deck is solid.

Beginner-friendly shows recommended by learners (easy → hard): 蓝漠的花 Lan Mo's Flower · 麻辣女配 Spicy Girl · 今天开始做明星 Start to Be a Star Today · 家有儿女 Home with Kids (sitcom, slow clear speech) · 双生灵探 Twin Spirit Detectives · 致我们单纯的小美好 A Love So Beautiful · 天官赐福 Heaven Official's Blessing (the xianxia register the media deck targets — a motivation show, not a study show). Parallel listening: Tingting Comprehensible Chinese, Lazy Chinese, Mandarin Click.

## How the content was checked

The lesson data was exported (`scripts/export-lessons.mjs`) and reviewed by 11 independent agents: three deep-research passes (conversation-first vocabulary, mastery thresholds, media-oriented sequencing), four simulated zero-knowledge learners who took units 1–6 and the sample exercises, and four Chinese-language experts (HSK-1 glosses/pinyin, media phrases, sentence segmentation, pedagogy). Their findings drove: curated learner glosses (`scripts/overrides.txt`), the pinned first units (`scripts/pinned-units.txt`), the media deck rewrite, the sentence pipeline (CC-CEDICT over-split rejection, pinyin validation, removals/retranslations in `scripts/sentence-fixes.txt`, hand-written micro-sentences), and the distractor rules. All 120 words of the first 12 units were confirmed to be genuine HSK 3.0 band-1 entries (500 words / 300 characters).

## Data & licenses

- Vocabulary: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT, CC-CEDICT glosses CC BY-SA 4.0) with official pinyin from [ivankra/hsk30](https://github.com/ivankra/hsk30) (MIT); curated learner glosses in `scripts/overrides.txt`.
- Subtitle frequency: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) zh_cn (OpenSubtitles 2018, CC BY-SA 4.0).
- Dictionary check for sentence segmentation: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (CC BY-SA 4.0), downloaded at build time only.
- Sentences: [Destaq/chinese-sentence-miner](https://github.com/Destaq/chinese-sentence-miner) → Tatoeba, CC BY 2.0 FR.
- Media phrases: `scripts/media.txt`, hand-curated.

## Backend and sync

Progress syncs to an account (`api/`, Micronaut 5 + Postgres). Design: `docs/superpowers/specs/2026-08-25-backend-sync-design.md`.

### Run everything

```bash
cp .env.example .env   # set POSTGRES_PASSWORD and a 32+ char JWT_SECRET
docker compose up --build -d
open http://localhost:3080
```

### Develop

```bash
# API — needs JDK 25 and Docker (Test Resources starts Postgres for you)
cd api && ./gradlew run        # http://localhost:8080
cd api && ./gradlew test

# Frontend — proxies /api to :8080
npm run dev

# End-to-end against the compose stack
node scripts/smoke.mjs http://localhost:3080
```

On Colima, Testcontainers needs `DOCKER_HOST=unix://$HOME/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`.

### Deploy (Coolify)

New resource → **Docker Compose** from this repo (deploy key). Set `POSTGRES_PASSWORD` and `JWT_SECRET` in the environment; `WEB_PORT` is only for local use. Point Pangolin at the `web` service, port 80. Flyway migrates on `api` start.
