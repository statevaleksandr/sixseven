// ================== НАСТРОЙКИ ==================
const AUDIO_SRC = "music.mp3";
const CORRECT_ANSWERS = ["justin bieber", "джастин бибер"];

// Google Form endpoint (ВАЖНО: /formResponse)
const FORM_RESPONSE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSeExXdt2She7pOIeMIjmwb7JL_oRmrVwCZxoVN4dSemzHr4aQ/formResponse";

// entry.* (как у тебя, чтобы таблица НЕ слетела)
const FORM_FIELDS = {
  sessionId: "entry.53703048",
  questionId: "entry.944260219",
  questionTitle: "entry.960165383",
  answerText: "entry.378002717",
  answerChoice: "entry.1420466812",
  answerMulti: "entry.966787247",
  isCorrect: "entry.580079395",
};

const SESSION_ID = crypto.randomUUID();

// ================== АУДИО ==================
const audio = new Audio(AUDIO_SRC);
audio.loop = true;
audio.preload = "auto";

// ================== DOM ==================
const deck = document.getElementById("deck");
const cardEl = document.getElementById("card");
const tapHint = document.getElementById("tapHint");
const clickCatcher = document.getElementById("clickCatcher");

// ================== STATE ==================
let step = 0;
let canAdvance = false;

// ================== GOOGLE FORMS SUBMIT ==================
function submitRowToGoogleForm(row) {
  const iframeName = "hidden_iframe_" + Math.random().toString(16).slice(2);

  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const form = document.createElement("form");
  form.action = FORM_RESPONSE_URL;
  form.method = "POST";
  form.target = iframeName;
  form.style.display = "none";

  const add = (entryName, value) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = entryName;
    input.value = value ?? "";
    form.appendChild(input);
  };

  add(FORM_FIELDS.sessionId, row.sessionId);
  add(FORM_FIELDS.questionId, row.questionId);
  add(FORM_FIELDS.questionTitle, row.questionTitle);
  add(FORM_FIELDS.answerText, row.answerText);
  add(FORM_FIELDS.answerChoice, row.answerChoice);
  add(FORM_FIELDS.answerMulti, row.answerMulti);
  add(FORM_FIELDS.isCorrect, String(!!row.isCorrect));

  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    form.remove();
    iframe.remove();
  }, 1500);
}

// ================== HELPERS ==================
function normalize(s) {
  return (s ?? "").trim().toLowerCase();
}
function isCorrectAnswer(raw) {
  const v = normalize(raw);
  return CORRECT_ANSWERS.map(normalize).includes(v);
}

// ================== УТИЛИТЫ ДЛЯ ТАПОВ ==================
// На некоторых карточках (с инпутами) нельзя включать clickCatcher,
// иначе он перехватит тап и инпут не получит фокус (особенно на телефоне).
function clearGlobalTaps() {
  clickCatcher.onclick = null;
  deck.onclick = null;
}

function setGlobalTapToNext(onlyWhenCanAdvance = false) {
  // используем clickCatcher: тапы по свободной области будут ловиться стабильно
  clickCatcher.classList.add("active");
  const handler = (e) => {
    if (
      e?.target &&
      (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
    ) {
      return;
    }
    if (onlyWhenCanAdvance && !canAdvance) return;
    slideToNext();
  };
  clickCatcher.onclick = handler;
  deck.onclick = handler;
}

function setCardTapToNext(wrap, onlyWhenCanAdvance = false, customNext) {
  // тут clickCatcher должен быть выключен, иначе он перекроет инпут
  clickCatcher.classList.remove("active");
  clearGlobalTaps();

  const go = () => {
    if (onlyWhenCanAdvance && !canAdvance) return;
    if (typeof customNext === "function") customNext();
    else slideToNext();
  };

  wrap.addEventListener("click", (e) => {
    if (
      e?.target &&
      (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
    ) {
      return;
    }
    go();
  });
}

// ================== АНИМАЦИЯ ПЕРЕХОДА ==================
function slideTo(targetStep) {
  if (targetStep < 0 || targetStep >= cards.length) return;
  if (targetStep === step) return;

  cardEl.classList.remove("slide-out");
  void cardEl.offsetWidth;
  cardEl.classList.add("slide-out");

  const finish = () => {
    cardEl.removeEventListener("animationend", finish);
    cardEl.classList.remove("slide-out");

    step = targetStep;
    renderCard();
  };

  cardEl.addEventListener("animationend", finish, { once: true });
}

function slideToNext() {
  if (step >= cards.length - 1) return;
  slideTo(step + 1);
}

// ================== КАРТОЧКИ ==================
const cards = [
  // ---------- 1) Приветствие ----------
  {
    id: "welcome",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Добрый день/вечер:0</h1>
        <p>Это некий скам-опрос</p>
        <p>Если готова, то можешь начинать&lt;3</p>
        <div class="spacer"></div>
        <button class="btn" id="startBtn" type="button">Начать</button>
      `;

      setTimeout(() => {
        document.getElementById("startBtn")?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            audio.play().catch(() => {});
            slideToNext();
          },
          { once: true }
        );
      }, 0);

      return wrap;
    },
  },

  // ---------- 2) Ввод ответа (переход по тапу только когда правильно) ----------
  {
    id: "answer",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Проверка подшар-отдела🗿</h1>
        <p>Кто исполняет под эту мелодию?🤔</p>

        <div class="field">
          <input id="answerInput" type="text" placeholder="можешь ввести на русском/английском" autocomplete="off" />
          <div class="status" id="status"></div>
        </div>
      `;

      setTimeout(() => {
        const input = document.getElementById("answerInput");
        const status = document.getElementById("status");
        input?.focus();

        let lastValue = "";
        let okNow = false;
        let saved = false;

        function updateUI() {
          if (okNow) {
            status.textContent = "Правильно ✓";
            status.classList.add("ok");
            canAdvance = true;

            tapHint.classList.add("show");
            // Тапаем по свободной области (через clickCatcher), но только когда canAdvance=true
            setGlobalTapToNext(true);
          } else {
            status.textContent = "";
            status.classList.remove("ok");
            canAdvance = false;

            tapHint.classList.remove("show");
            clickCatcher.classList.remove("active");
            clearGlobalTaps();
          }
        }

        input?.addEventListener("input", () => {
          lastValue = input.value;
          okNow = isCorrectAnswer(lastValue);
          updateUI();
        });

        // чтобы тап/клик по инпуту никогда не листал
        input?.addEventListener("pointerdown", (e) => e.stopPropagation());
        input?.addEventListener("click", (e) => e.stopPropagation());

        // Переопределяем переход, чтобы перед уходом сохранить ответ
        const originalSlideToNext = slideToNext;
        function goNextWithSave() {
          if (!canAdvance) return;

          if (!saved) {
            saved = true;
            submitRowToGoogleForm({
              sessionId: SESSION_ID,
              questionId: "q1",
              questionTitle: "Мини-вопрос",
              answerText: lastValue,
              answerChoice: "",
              answerMulti: "",
              isCorrect: okNow,
            });
          }

          originalSlideToNext();
        }

        // Вместо стандартного глобального перехода — ставим кастомный
        // (через clickCatcher, чтобы можно было тапнуть мимо инпута)
        clickCatcher.onclick = (e) => {
          if (
            e?.target &&
            (e.target.closest("input") || e.target.closest("button") || e.target.closest("a"))
          ) {
            return;
          }
          goNextWithSave();
        };
        deck.onclick = clickCatcher.onclick;
      }, 0);

      return wrap;
    },
  },

  // ---------- 3) Просто текст (по тапу дальше) ----------
  {
    id: "after-answer-text",
    render() {
      canAdvance = true;

      tapHint.classList.add("show");
      // Здесь можно спокойно использовать clickCatcher
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Отлично!</h1>
        <p>Это карточка просто с текстом.</p>
        <p>Тапни в любом месте, чтобы продолжить.</p>
      `;
      return wrap;
    },
  },

  // ---------- 4) Вопрос Да/Нет (ветвление) ----------
  {
    id: "yesno",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Вопрос</h1>
        <p>Продолжаем дальше?</p>

        <div class="btn-row">
          <button class="btn" id="yesBtn" type="button">Да</button>
          <button class="btn" id="noBtn" type="button">Нет</button>
        </div>
      `;

      setTimeout(() => {
        const yesBtn = document.getElementById("yesBtn");
        const noBtn = document.getElementById("noBtn");

        const yesStartIdx = cards.findIndex((c) => c.id === "yes-1");
        const noCommentIdx = cards.findIndex((c) => c.id === "comment-no");

        let saved = false;
        function saveChoice(choice) {
          if (saved) return;
          saved = true;

          submitRowToGoogleForm({
            sessionId: SESSION_ID,
            questionId: "q2",
            questionTitle: "Продолжаем?",
            answerText: "",
            answerChoice: choice,
            answerMulti: "",
            isCorrect: false,
          });
        }

        yesBtn?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveChoice("Да");
            slideTo(yesStartIdx);
          },
          { once: true }
        );

        noBtn?.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            saveChoice("Нет");
            slideTo(noCommentIdx);
          },
          { once: true }
        );
      }, 0);

      return wrap;
    },
  },

  // ================== ВЕТКА "ДА" ==================

  // ---------- 5) yes-1 (по тапу дальше) ----------
  {
    id: "yes-1",
    render() {
      canAdvance = true;
      tapHint.classList.add("show");
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Супер 😄</h1>
        <p>Это первая карточка ветки “да”.</p>
        <p>Тапни, чтобы продолжить.</p>
      `;
      return wrap;
    },
  },

  // ---------- 6) yes-2 (по тапу дальше) ----------
  {
    id: "yes-2",
    render() {
      canAdvance = true;
      tapHint.classList.add("show");
      setGlobalTapToNext(false);

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Ещё шаг</h1>
        <p>Вторая карточка ветки “да”.</p>
        <p>Тапни, чтобы продолжить.</p>
      `;
      return wrap;
    },
  },

  // ---------- 7) comment-yes (ИНПУТ: clickCatcher выключен, переход по тапу по карточке) ----------
  {
  id: "comment-yes",
  render() {
    canAdvance = true;

    tapHint.classList.add("show");

    // ВАЖНО: clickCatcher выключаем, иначе он перекроет input
    clickCatcher.classList.remove("active");
    clickCatcher.onclick = null;
    deck.onclick = null;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <h1>Комментарий</h1>
      <p>Оставь комментарий перед финалом 👇</p>

      <div class="field">
        <input id="commentYesInput" type="text"
               placeholder="твой комментарий (можно пусто)"
               autocomplete="off" />
        <div class="status" id="commentYesStatus"></div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById("commentYesInput");
      const status = document.getElementById("commentYesStatus");

      let saved = false;

      function saveAndGo() {
        if (saved) return;
        saved = true;

        const comment = input?.value ?? "";

        submitRowToGoogleForm({
          sessionId: SESSION_ID,
          questionId: "comment_yes",
          questionTitle: "Комментарий (ветка Да)",
          answerText: comment,
          answerChoice: "",
          answerMulti: "",
          isCorrect: false,
        });

        const endYesIdx = cards.findIndex((c) => c.id === "end-yes");
        slideTo(endYesIdx);
      }

      // Тап по input НЕ должен листать
      input?.addEventListener("pointerdown", (e) => e.stopPropagation());
      input?.addEventListener("click", (e) => e.stopPropagation());

      // Тап по КАРТОЧКЕ (вне input) = сохранить и перейти
      cardEl.onpointerdown = (e) => {
        if (e?.target && e.target.closest("input")) return;
        saveAndGo();
      };

      function updateStatus() {
        const hasText = ((input?.value ?? "").trim().length > 0);
        status.textContent = hasText
          ? "Тапни по карточке (мимо поля), чтобы сохранить ✓"
          : "Тапни по карточке (мимо поля), чтобы продолжить";
        status.classList.toggle("ok", hasText);
      }

      input?.addEventListener("input", updateStatus);
      updateStatus();
    }, 0);

    return wrap;
  }
},



  // ---------- 8) Финал ветки "ДА" ----------
  {
    id: "end-yes",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Финал 🎉</h1>
        <p>Это конечная карточка ветки “да”.</p>
      `;
      return wrap;
    },
  },

  // ================== ВЕТКА "НЕТ" ==================

  // ---------- 9) comment-no (ИНПУТ: clickCatcher выключен, переход по тапу по карточке) ----------
  {
  id: "comment-no",
  render() {
    canAdvance = true;

    tapHint.classList.add("show");

    // ВАЖНО: clickCatcher выключаем, иначе он перекроет input
    clickCatcher.classList.remove("active");
    clickCatcher.onclick = null;
    deck.onclick = null;

    const wrap = document.createElement("div");
    wrap.innerHTML = `
      <h1>Комментарий</h1>
      <p>Перед завершением можешь написать комментарий 👇</p>

      <div class="field">
        <input id="commentNoInput" type="text"
               placeholder="твой комментарий (можно пусто)"
               autocomplete="off" />
        <div class="status" id="commentNoStatus"></div>
      </div>
    `;

    setTimeout(() => {
      const input = document.getElementById("commentNoInput");
      const status = document.getElementById("commentNoStatus");

      let saved = false;

      function saveAndGo() {
        if (saved) return;
        saved = true;

        const comment = input?.value ?? "";

        submitRowToGoogleForm({
          sessionId: SESSION_ID,
          questionId: "comment_no",
          questionTitle: "Комментарий (ветка Нет)",
          answerText: comment,
          answerChoice: "",
          answerMulti: "",
          isCorrect: false,
        });

        const endNoIdx = cards.findIndex((c) => c.id === "end-no");
        slideTo(endNoIdx);
      }

      // Тап по input НЕ должен листать
      input?.addEventListener("pointerdown", (e) => e.stopPropagation());
      input?.addEventListener("click", (e) => e.stopPropagation());

      // Тап по КАРТОЧКЕ (вне input) = сохранить и перейти
      cardEl.onpointerdown = (e) => {
        if (e?.target && e.target.closest("input")) return;
        saveAndGo();
      };

      function updateStatus() {
        const hasText = ((input?.value ?? "").trim().length > 0);
        status.textContent = hasText
          ? "Тапни по карточке (мимо поля), чтобы сохранить ✓"
          : "Тапни по карточке (мимо поля), чтобы завершить";
        status.classList.toggle("ok", hasText);
      }

      input?.addEventListener("input", updateStatus);
      updateStatus();
    }, 0);

    return wrap;
  }
},



  // ---------- 10) Финал ветки "НЕТ" ----------
  {
    id: "end-no",
    render() {
      canAdvance = false;

      tapHint.classList.remove("show");
      clickCatcher.classList.remove("active");
      clearGlobalTaps();

      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <h1>Окей 🙃</h1>
        <p>Тогда на этом заканчиваем (ветка “нет”).</p>
      `;
      return wrap;
    },
  },
];

// ================== РЕНДЕР ==================
function renderCard() {
  // чтобы обработчик с прошлой карточки не оставался
  cardEl.onclick = null;
  cardEl.onpointerdown = null;

  cardEl.classList.remove("deal-in");
  cardEl.innerHTML = "";
  cardEl.appendChild(cards[step].render());
  requestAnimationFrame(() => cardEl.classList.add("deal-in"));
}


// старт
renderCard();
