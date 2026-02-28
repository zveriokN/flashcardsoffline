
let cards = [];
let progress = JSON.parse(localStorage.getItem('progress') || '{}');
let filtered = [];
let current = null;
let flipped = false;

const directionSelect = document.getElementById("direction");
const topicSelect = document.getElementById("topic-select");

const SHEET_ID = "1bbnYBa4qb7UMLY7TwCgG_POn1rhLfhAb02UDCx_jBQc";
const SHEET_NAME = "Лист1"; // ← Поменяй на точное название листа (как вкладка снизу в таблице)

function buildGvizUrl() {
  const sheet = encodeURIComponent(SHEET_NAME);
  const tq = encodeURIComponent("select A,B,D where A is not null");
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${sheet}&tq=${tq}`;
}

function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1));
}

function loadSheetJSON() {
  const url = buildGvizUrl();

  fetch(url)
    .then(res => res.text())
    .then(text => {
      const gviz = parseGviz(text);
      const rows = gviz.table.rows || [];

      cards = rows
        .map((row) => {
          const c = row.c || [];
          const ru = (c[0]?.v ?? "").toString().trim();
          const ja = (c[1]?.v ?? "").toString().trim();
          const topicCell = c[2];
          const topic = (topicCell?.v ?? topicCell?.f ?? "Без темы").toString().trim();

          if (!ru || !ja) return null;

          // Стабильный id: прогресс не "съезжает" при добавлении строк в таблицу
          const id = `${ru}|||${ja}|||${topic}`;
          return { id, ru, ja, topic };
        })
        .filter(Boolean);

      // кэш карточек для офлайна
      localStorage.setItem("cards_cache", JSON.stringify(cards));

      populateTopics();
      updateFiltered();
      showNext();
    })
    .catch(err => {
      console.error("Sheet JSON load failed:", err);

      // офлайн-фолбэк: используем последнюю сохранённую копию
      const cached = localStorage.getItem("cards_cache");
      if (cached) {
        cards = JSON.parse(cached);
        populateTopics();
        updateFiltered();
        showNext();
      } else {
        document.getElementById("card").textContent = "Не удалось загрузить данные";
      }
    });
}

function populateTopics() {
  // очищаем всё, кроме первого пункта "Все темы"
  topicSelect.innerHTML = '<option value="all">Все темы</option>';

  const topics = [...new Set(cards.map(c => c.topic))];
  topics.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    topicSelect.appendChild(opt);
  });
}

function updateFiltered() {
  const selected = topicSelect.value;
  filtered = cards.filter(c => selected === "all" || c.topic === selected);
}

function getWeightedCard() {
  const hard = filtered.filter(c => !progress[c.id] || progress[c.id] === "hard");
  const easy = filtered.filter(c => progress[c.id] === "easy");
  const pool = [...hard.flatMap(c => Array(4).fill(c)), ...easy];
  return pool[Math.floor(Math.random() * pool.length)];
}

function showNext() {
  if (!filtered.length) return;
  current = getWeightedCard();
  flipped = false;
  showCard();
  updateProgress();
}

function showCard() {
  const card = document.getElementById("card");
  if (!current) return;
  const dir = directionSelect.value;
  card.textContent = flipped
    ? (dir === "ru-ja" ? current.ja : current.ru)
    : (dir === "ru-ja" ? current.ru : current.ja);
}

document.getElementById("card").addEventListener("click", () => {
  flipped = !flipped;
  showCard();
});
document.getElementById("next").addEventListener("click", showNext);
document.getElementById("easy").addEventListener("click", () => {
  progress[current.id] = "easy";
  saveProgress();
  showNext();
});
document.getElementById("hard").addEventListener("click", () => {
  progress[current.id] = "hard";
  saveProgress();
  showNext();
});
document.getElementById("reset").addEventListener("click", () => {
  filtered.forEach(c => delete progress[c.id]);
  saveProgress();
  showNext();
});
directionSelect.addEventListener("change", showCard);
topicSelect.addEventListener("change", () => {
  updateFiltered();
  showNext();
});

function updateProgress() {
  const total = filtered.length;
  let learned = 0;
  for (const card of filtered) {
    if (progress[card.id] === "easy") learned++;
  }
  const percent = total ? Math.round((learned / total) * 100) : 0;
  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progress-text").textContent = `Выучено: ${learned} из ${total}`;
}

function saveProgress() {
  localStorage.setItem("progress", JSON.stringify(progress));
}

loadSheetJSON();
