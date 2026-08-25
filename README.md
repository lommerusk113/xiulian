# Xiulian 修炼

*Xiūliàn* — to cultivate. A keyboard-free Mandarin (simplified) learning app for going from zero to reading web novels in [Readibu](https://readibu.com) and following donghua / manhua. Vue 3 · TypeScript · Tailwind v4 · Nuxt UI 4 · ts-fsrs. Works as an installable PWA on phone and desktop. No accounts, no backend — progress lives in the browser (export/import in Settings).

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

- **Themes** — pronouns, core verbs, food & drink, people & places, time, numbers, adjectives. Each theme is split into 6–7-word lessons with heavy repetition (three drills per word plus a full second pass). Every lesson ends by combining: sentences that mix the lesson's words with everything you already know — more of them as your vocabulary grows — and each may sneak in one word you haven't met yet (as a comprehension question, with the new word called out afterwards).

- **HSK core** — the HSK 3.0 word list, bands 1–4 (3,178 words, ~1,200 characters), 10 words per unit. The first nine units are hand-pinned around what you can *say* (hello/thanks → who are you → this/that → want/can/know → numbers → how much → where/when → doing/liking → people/going); after that, band then subtitle frequency. Band 4 is roughly where learners report Readibu's easiest stories become readable with a pop-up dictionary; real web novels are band 5–6, where reading itself takes over from flashcards.
- **Donghua & manhua** — 214 recurring phrases from xianxia / wuxia shows and comics, reviewed by native-speaker agents: reactions (算了, 真的假的, 厉害), shouting (住手! 站住! 饶命!), address (师父, 前辈, 大人, 陛下), cultivation terms (灵气, 突破, 金丹…), plus show-specific deep cuts. Anything that is already an HSK 1–2 word lives in the core track instead.

**Daily challenge.** Ten recognition exercises fixed for the day (seeded by date), drawn mostly from your *next* unit plus your weakest recent words — hard before the day's lesson, doable after. Unlimited attempts, no effect on scheduling; the result screen lines up today's attempts and Home keeps a 7-day best-score strip, so the gap between the morning try and the evening try is your visible progress.

**Lesson strength.** Finishing a lesson adds +100% to that lesson's strength; you can stack past 100% (the ring changes colour per tier: ×1, ×2, …). Strength decays every day by `max(10, 101 − completions)`% of its current value — done once, it's gone the next day; done twice, −99%/day; the more times you've completed it, the slower it fades, down to a floor of 10%/day. Repeating a lesson drills every word, not just the new ones.

**Ranks.** A word is *known* when FSRS predicts you'll remember it for 21+ days (Anki's "mature" line). Known words keep coming back, just rarely. You earn HSK rank N when 90% of band N is known. Home also shows a **subtitle coverage** meter — the share of all words spoken in film/TV subtitles that you've met.

**Sentence builder** (Build tab): tap words from your bank (pronouns, verbs, nouns, question words…) to compose a sentence, shown in both pinyin and characters, hear it, and check it. Exact matches against the 690-sentence corpus are confirmed as real; otherwise a rule-based check catches the classic beginner mistakes (吗 not at the end, 是 + adjective, 不有, missing measure word, 二 vs 两, adverb placement…). It is not a full grammar checker.

Exercises (all touch/mouse only):

| Exercise | Trains |
|---|---|
| New word card | character + pinyin + meaning + audio, plus an example sentence built only from words you already know |
| Pinyin → meaning · meaning → pinyin · audio → pinyin | sound-first recognition and tones (pinyin focus) |
| Character → meaning | reading |
| Meaning → character | recognition among look-alikes |
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

New words only get "guess the meaning" exercises (pinyin/character/audio → meaning). Producing the form (meaning → character/pinyin, tiles) unlocks once the word is in review, and tone-precise pinyin-from-character only after about a week of stability. In theme and donghua lessons a missed question goes to the back of the pile and comes around again (up to three times; the intro card returns before the third try). **HSK core lessons are strict:** a mistake shows the answer and restarts the lesson — you finish it only by getting through clean.

Distractors are drawn from words you've already met, matched on length and part of speech, never sharing a gloss word or (for listening) a pronunciation with the answer — so exercises can't be solved by elimination.

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
