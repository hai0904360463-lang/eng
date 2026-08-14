/* ===== English Quest — game engine =====
   VOCAB is loaded from vocab.js before this file. */

const TOTAL_LEVELS = 100;
const QUESTIONS_PER_LEVEL = 50;
const PASS_THRESHOLD = 30;
const STORAGE_KEY = "english_quest_progress_v1";

/* ---------- seeded RNG so a given level always produces the same quiz ---------- */
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleWith(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pickN(arr, n, rnd) {
  return shuffleWith(arr, rnd).slice(0, n);
}

/* ---------- vocab pools ---------- */
function wordsUpToLevel(level) {
  return VOCAB.filter((w) => w.level <= level);
}
function newWordsAtLevel(level) {
  return VOCAB.filter((w) => w.level === level);
}

/* Distractor picker: prefer words NOT equal to correct word, any pool available */
function distractorsFor(correctWord, pool, n, rnd) {
  const candidates = pool.filter((w) => w.id !== correctWord.id);
  return pickN(candidates, n, rnd);
}

/* ---------- question builders (each returns a question object) ----------
   type: "meaning_mc" | "word_mc" | "fill_blank" | "true_false" | "listen_mc"
   Every question has: id, type, word (the vocab item this drills), prompt,
   choices (array of strings) OR null for true_false, correctIndex,
   hint (string, revealed on demand), explain (shown after answering) */

function buildMeaningMC(word, pool, rnd) {
  const distractors = distractorsFor(word, pool, 3, rnd).map((w) => w.meaning);
  const choices = shuffleWith([word.meaning, ...distractors], rnd);
  return {
    type: "meaning_mc",
    word,
    prompt: `"${word.word}" nghĩa là gì?`,
    choices,
    correctIndex: choices.indexOf(word.meaning),
    hint: `Gợi ý: từ này bắt đầu bằng chữ "${word.word[0].toUpperCase()}" và có ${word.word.length} chữ cái.`,
    explain: `"${word.word}" = ${word.meaning}. Ví dụ: ${word.example}`,
  };
}

function buildWordMC(word, pool, rnd) {
  const distractors = distractorsFor(word, pool, 3, rnd).map((w) => w.word);
  const choices = shuffleWith([word.word, ...distractors], rnd);
  return {
    type: "word_mc",
    word,
    prompt: `Từ tiếng Anh nào có nghĩa là "${word.meaning}"?`,
    choices,
    correctIndex: choices.indexOf(word.word),
    hint: `Gợi ý: từ tiếng Anh có ${word.word.length} chữ cái, bắt đầu bằng "${word.word[0].toUpperCase()}".`,
    explain: `"${word.meaning}" = ${word.word}. Ví dụ: ${word.example}`,
  };
}

function buildFillBlank(word, pool, rnd) {
  const re = new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const blanked = word.example.replace(re, "_____");
  const distractors = distractorsFor(word, pool, 3, rnd).map((w) => w.word);
  const choices = shuffleWith([word.word, ...distractors], rnd);
  return {
    type: "fill_blank",
    word,
    prompt: `Điền vào chỗ trống: "${blanked}"`,
    choices,
    correctIndex: choices.indexOf(word.word),
    hint: `Gợi ý: nghĩa của từ cần điền là "${word.meaning}".`,
    explain: `Câu đầy đủ: "${word.example}" — "${word.word}" nghĩa là ${word.meaning}.`,
  };
}

function buildTrueFalse(word, pool, rnd) {
  const isTrueStatement = rnd() > 0.5;
  const shownMeaning = isTrueStatement
    ? word.meaning
    : distractorsFor(word, pool, 1, rnd)[0]?.meaning || word.meaning;
  const choices = ["Đúng", "Sai"];
  return {
    type: "true_false",
    word,
    prompt: `"${word.word}" nghĩa là "${shownMeaning}". Đúng hay Sai?`,
    choices,
    correctIndex: isTrueStatement ? 0 : 1,
    hint: `Gợi ý: nghĩa thật của "${word.word}" bắt đầu bằng chữ "${word.meaning[0]}".`,
    explain: `"${word.word}" thực sự nghĩa là "${word.meaning}". Ví dụ: ${word.example}`,
  };
}

function buildListenMC(word, pool, rnd) {
  const distractors = distractorsFor(word, pool, 3, rnd).map((w) => w.word);
  const choices = shuffleWith([word.word, ...distractors], rnd);
  return {
    type: "listen_mc",
    word,
    prompt: `Nghe phát âm và chọn đúng từ (bấm loa 🔊):`,
    choices,
    correctIndex: choices.indexOf(word.word),
    hint: `Gợi ý: từ này nghĩa là "${word.meaning}".`,
    explain: `Từ vừa phát âm là "${word.word}" (${word.meaning}). Ví dụ: ${word.example}`,
  };
}

const BUILDERS = [buildMeaningMC, buildWordMC, buildFillBlank, buildTrueFalse, buildListenMC];

/* ---------- main generator: 50 questions for a level ---------- */
function generateLevelQuestions(level) {
  const rnd = mulberry32(level * 7919 + 13);
  const newWords = newWordsAtLevel(level);
  const reviewPool = wordsUpToLevel(level - 1);
  const fullPool = wordsUpToLevel(level);

  // Build a drilling list: new words appear ~3x (weighted), review words fill the rest
  let drillWords = [];
  newWords.forEach((w) => {
    drillWords.push(w, w, w);
  });
  const reviewNeeded = Math.max(0, QUESTIONS_PER_LEVEL - drillWords.length);
  const reviewSample = pickN(reviewPool.length ? reviewPool : newWords, reviewNeeded, rnd);
  drillWords = drillWords.concat(reviewSample);

  // pad/trim to exactly QUESTIONS_PER_LEVEL by cycling the pool
  while (drillWords.length < QUESTIONS_PER_LEVEL) {
    drillWords.push(fullPool[Math.floor(rnd() * fullPool.length)]);
  }
  drillWords = shuffleWith(drillWords, rnd).slice(0, QUESTIONS_PER_LEVEL);

  const questions = drillWords.map((word, i) => {
    const builder = BUILDERS[Math.floor(rnd() * BUILDERS.length)];
    const q = builder(word, fullPool.length > 4 ? fullPool : VOCAB, rnd);
    q.id = `L${level}-Q${i + 1}`;
    return q;
  });
  return questions;
}

/* ---------- progress persistence (localStorage, degrades gracefully) ---------- */
const memoryFallback = { unlocked: 1, scores: {}, stars: {} };
function storageAvailable() {
  try {
    const k = "__eq_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch (e) {
    return false;
  }
}
const HAS_STORAGE = storageAvailable();

function loadProgress() {
  if (!HAS_STORAGE) return { ...memoryFallback };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1, scores: {}, stars: {} };
    const parsed = JSON.parse(raw);
    return { unlocked: parsed.unlocked || 1, scores: parsed.scores || {}, stars: parsed.stars || {} };
  } catch (e) {
    return { ...memoryFallback };
  }
}

function saveProgress(progress) {
  if (HAS_STORAGE) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      Object.assign(memoryFallback, progress);
    }
  } else {
    Object.assign(memoryFallback, progress);
  }
}

function recordLevelResult(level, correctCount) {
  const progress = loadProgress();
  const passed = correctCount >= PASS_THRESHOLD;
  progress.scores[level] = Math.max(progress.scores[level] || 0, correctCount);
  if (passed) {
    const stars = correctCount >= 45 ? 3 : correctCount >= 38 ? 2 : 1;
    progress.stars[level] = Math.max(progress.stars[level] || 0, stars);
    if (level >= progress.unlocked && level < TOTAL_LEVELS) {
      progress.unlocked = level + 1;
    }
  }
  saveProgress(progress);
  return { passed, progress };
}

function exportProgressJSON() {
  return JSON.stringify(loadProgress(), null, 2);
}
function importProgressJSON(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.unlocked !== "number") return false;
    saveProgress({ unlocked: parsed.unlocked, scores: parsed.scores || {}, stars: parsed.stars || {} });
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------- text-to-speech helper for listen_mc ---------- */
function speakWord(word) {
  if (!("speechSynthesis" in window)) return false;
  try {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-US";
    utter.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    return true;
  } catch (e) {
    return false;
  }
}
