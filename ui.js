/* ===== English Quest — UI controller ===== */
(function () {
  const screens = {
    map: document.getElementById("screen-map"),
    intro: document.getElementById("screen-intro"),
    quiz: document.getElementById("screen-quiz"),
    result: document.getElementById("screen-result"),
  };

  let state = {
    progress: loadProgress(),
    currentLevel: null,
    questions: [],
    qIndex: 0,
    correctCount: 0,
    answered: false,
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  /* ---------------- MAP SCREEN ---------------- */
  function renderMap() {
    state.progress = loadProgress();
    const wrap = document.getElementById("path-wrap");
    wrap.innerHTML = "";

    document.getElementById("map-badge").textContent =
      `${state.progress.unlocked}/${TOTAL_LEVELS}`;

    let lastTopic = null;
    for (let lvl = 1; lvl <= TOTAL_LEVELS; lvl++) {
      const topicWords = newWordsAtLevel(lvl);
      const topic = topicWords.length ? topicWords[0].topic : lastTopic;
      if (topic && topic !== lastTopic) {
        const div = document.createElement("div");
        div.className = "topic-divider";
        div.textContent = topic;
        wrap.appendChild(div);
        lastTopic = topic;
      }

      const row = document.createElement("div");
      row.className = "path-row";
      row.style.justifyContent =
        ["center", "flex-start", "flex-end"][lvl % 3] === "center"
          ? "center"
          : lvl % 3 === 1
          ? "flex-start"
          : "flex-end";
      row.style.paddingLeft = row.style.justifyContent === "flex-start" ? "20%" : "0";
      row.style.paddingRight = row.style.justifyContent === "flex-end" ? "20%" : "0";

      const btn = document.createElement("button");
      const isLocked = lvl > state.progress.unlocked;
      const isCompleted = !!state.progress.stars[lvl];
      const isCurrent = lvl === state.progress.unlocked;
      btn.className =
        "level-node " + (isLocked ? "locked" : isCompleted ? "completed" : "unlocked") + (isCurrent ? " current" : "");
      btn.innerHTML = isLocked ? "🔒" : String(lvl);
      btn.disabled = isLocked;
      if (isCompleted) {
        const stars = document.createElement("span");
        stars.className = "stars";
        stars.textContent = "★".repeat(state.progress.stars[lvl]);
        btn.appendChild(stars);
      }
      btn.addEventListener("click", () => openIntro(lvl));
      row.appendChild(btn);
      wrap.appendChild(row);
    }
  }

  /* ---------------- INTRO SCREEN ---------------- */
  function openIntro(level) {
    state.currentLevel = level;
    document.getElementById("intro-level-num").textContent = `LEVEL ${level} / ${TOTAL_LEVELS}`;
    const words = newWordsAtLevel(level);
    const list = document.getElementById("word-preview-list");
    list.innerHTML = "";
    if (words.length === 0) {
      list.innerHTML = `<li>Ôn tập các từ đã học trước đó.</li>`;
    } else {
      words.forEach((w) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="w">${w.word}</span><span class="m">${w.meaning}</span>`;
        list.appendChild(li);
      });
    }
    const best = state.progress.scores[level];
    document.getElementById("intro-best").textContent = best
      ? `Điểm cao nhất của bạn: ${best}/${QUESTIONS_PER_LEVEL}`
      : `Chưa hoàn thành lần nào.`;
    showScreen("intro");
  }

  document.getElementById("intro-back").addEventListener("click", () => {
    renderMap();
    showScreen("map");
  });
  document.getElementById("intro-start").addEventListener("click", () => startQuiz(state.currentLevel));

  /* ---------------- QUIZ SCREEN ---------------- */
  function startQuiz(level) {
    state.questions = generateLevelQuestions(level);
    state.qIndex = 0;
    state.correctCount = 0;
    document.getElementById("quiz-level-tag").textContent = `Level ${level}`;
    showScreen("quiz");
    renderQuestion();
  }

  const TYPE_LABEL = {
    meaning_mc: "Nghĩa của từ",
    word_mc: "Chọn từ đúng",
    fill_blank: "Điền vào chỗ trống",
    true_false: "Đúng hay Sai",
    listen_mc: "Nghe & chọn",
  };

  function renderQuestion() {
    state.answered = false;
    const q = state.questions[state.qIndex];
    const total = state.questions.length;

    document.getElementById("progress-fill").style.width = `${(state.qIndex / total) * 100}%`;
    document.getElementById("score-chip").textContent = `${state.correctCount} đúng · Câu ${state.qIndex + 1}/${total}`;
    document.getElementById("question-type-tag").textContent = TYPE_LABEL[q.type] || "";
    document.getElementById("question-prompt").textContent = q.prompt;

    const speakBtn = document.getElementById("speak-btn");
    speakBtn.style.display = q.type === "listen_mc" ? "flex" : "none";
    speakBtn.onclick = () => speakWord(q.word.word);
    if (q.type === "listen_mc") setTimeout(() => speakWord(q.word.word), 300);

    const choicesWrap = document.getElementById("choices");
    choicesWrap.innerHTML = "";
    q.choices.forEach((choice, i) => {
      const b = document.createElement("button");
      b.className = "choice-btn";
      b.textContent = choice;
      b.addEventListener("click", () => selectAnswer(i));
      choicesWrap.appendChild(b);
    });

    document.getElementById("hint-text").classList.remove("shown");
    document.getElementById("hint-text").textContent = q.hint;
    document.getElementById("hint-btn").disabled = false;
    document.getElementById("explain-box").classList.remove("shown");
    document.getElementById("next-btn").style.display = "none";
  }

  document.getElementById("hint-btn").addEventListener("click", () => {
    document.getElementById("hint-text").classList.add("shown");
    document.getElementById("hint-btn").disabled = true;
  });

  function selectAnswer(i) {
    if (state.answered) return;
    state.answered = true;
    const q = state.questions[state.qIndex];
    const correct = i === q.correctIndex;
    if (correct) state.correctCount++;

    const buttons = document.querySelectorAll("#choices .choice-btn");
    buttons.forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.correctIndex) b.classList.add("correct");
      else if (idx === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const explainBox = document.getElementById("explain-box");
    explainBox.textContent = (correct ? "✅ Chính xác! " : "❌ Chưa đúng. ") + q.explain;
    explainBox.classList.add("shown");

    document.getElementById("next-btn").style.display = "block";
    document.getElementById("next-btn").textContent =
      state.qIndex + 1 >= state.questions.length ? "Xem kết quả" : "Câu tiếp theo →";
  }

  document.getElementById("quiz-exit-btn").addEventListener("click", () => {
    const ok = confirm("Thoát level này? Kết quả của lượt học dở dang sẽ không được lưu.");
    if (ok) {
      renderMap();
      showScreen("map");
    }
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    state.qIndex++;
    if (state.qIndex >= state.questions.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  });

  /* ---------------- RESULT SCREEN ---------------- */
  function finishQuiz() {
    const { passed, progress } = recordLevelResult(state.currentLevel, state.correctCount);
    state.progress = progress;
    showScreen("result");

    const stampEl = document.getElementById("stamp");
    stampEl.className = "stamp" + (passed ? "" : " fail");
    stampEl.querySelector(".big").textContent = passed ? "PASS" : "RETRY";
    stampEl.querySelector(".label").textContent = passed
      ? `Đã chinh phục Level ${state.currentLevel}`
      : `Cần ${PASS_THRESHOLD}/${QUESTIONS_PER_LEVEL} để qua level`;

    document.getElementById("result-score").textContent =
      `${state.correctCount} / ${QUESTIONS_PER_LEVEL} câu đúng`;

    const stars = progress.stars[state.currentLevel] || 0;
    document.getElementById("result-stars").textContent = stars ? "★".repeat(stars) + "☆".repeat(3 - stars) : "";

    const nextBtn = document.getElementById("result-next");
    const hasNext = state.currentLevel < TOTAL_LEVELS;
    nextBtn.style.display = passed && hasNext ? "block" : "none";
    nextBtn.onclick = () => openIntro(state.currentLevel + 1);

    document.getElementById("result-retry").onclick = () => startQuiz(state.currentLevel);
    document.getElementById("result-map").onclick = () => {
      renderMap();
      showScreen("map");
    };
  }

  /* ---------------- backup export / import ---------------- */
  document.getElementById("export-btn").addEventListener("click", () => {
    const blob = new Blob([exportProgressJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "english-quest-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("import-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importProgressJSON(reader.result);
      alert(ok ? "Đã khôi phục tiến độ!" : "File không hợp lệ.");
      renderMap();
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ---------------- init ---------------- */
  renderMap();
  showScreen("map");

  if (!HAS_STORAGE) {
    console.warn("localStorage không khả dụng — tiến độ chỉ được lưu tạm trong phiên này.");
  }
})();
