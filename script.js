
let cards = [];
let progress = JSON.parse(localStorage.getItem('progress') || '{}');
let filtered = [];
let current = null;
let flipped = false;

const directionSelect = document.getElementById("direction");
const topicSelect = document.getElementById("topic-select");

function loadCSV() {
  fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vSxo3ndoMSpz1pCg--2q2yoYGyZU85EIEIKBtX9gpYejA10jtEJK0rOO38QIwHX7efUj3A9tEVyU6fd/pub?output=csv")
    .then(res => res.text())
    .then(text => {
      const lines = text.trim().split("\n").slice(1);
      cards = lines.map((line, i) => {
        const [ru, ja, topic] = line.split(",");
        return { id: i, ru: ru.trim(), ja: ja.trim(), topic: topic.trim() };
      });
      populateTopics();
      updateFiltered();
      showNext();
    });
}

function populateTopics() {
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

loadCSV();
