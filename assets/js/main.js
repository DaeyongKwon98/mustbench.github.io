const COLORS = {
  gt: "#111827",
  ours: "#16a34a",
  open: "#2563eb",
  closed: "#d97706",
  base: "#dc2626",
  other: "#6b7280"
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function percent(time, duration) {
  return Math.max(0, Math.min(100, (time / duration) * 100));
}

function renderTasks(tasks) {
  const container = document.getElementById("taskCards");
  container.innerHTML = "";

  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${task.abbr}: ${task.name}</h3>
      <p>${task.description}</p>
      <p><strong>Metric:</strong> ${task.metric}</p>
    `;
    container.appendChild(card);
  });
}

function addPointMarker(timeline, item, duration, color, top) {
  const marker = document.createElement("div");
  marker.className = "marker";
  marker.style.left = `${percent(item.time, duration)}%`;
  marker.style.top = `${top}px`;
  marker.style.background = color;

  const label = document.createElement("div");
  label.className = "marker-label";
  label.style.background = color;
  label.textContent = item.label;

  marker.appendChild(label);
  timeline.appendChild(marker);
}

function addIntervalMarker(timeline, item, duration, color, top) {
  const interval = document.createElement("div");
  interval.className = "interval";
  interval.style.left = `${percent(item.start, duration)}%`;
  interval.style.width = `${percent(item.end - item.start, duration)}%`;
  interval.style.top = `${top}px`;
  interval.style.background = color;

  const label = document.createElement("div");
  label.className = "marker-label";
  label.style.background = color;
  label.textContent = item.label;

  interval.appendChild(label);
  timeline.appendChild(interval);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderPredictionRows(table, predictions) {
  table.innerHTML = "";

  predictions.forEach((prediction) => {
    const row = document.createElement("tr");
    row.className = `prediction-row ${prediction.kind || ""}`;

    row.innerHTML = `
      <td><strong>${escapeHtml(prediction.model)}</strong></td>
      <td>
        <div>${escapeHtml(prediction.text)}</div>
        ${
          prediction.observation
            ? `<div class="prediction-observation">${escapeHtml(prediction.observation)}</div>`
            : ""
        }
      </td>
      <td>${escapeHtml(prediction.score ?? "-")}</td>
    `;

    table.appendChild(row);
  });
}

function renderTimeline(timeline, example) {
  timeline.innerHTML = "";

  example.ground_truth.forEach((gt) => {
    if (gt.type === "point") {
      addPointMarker(timeline, gt, example.duration, COLORS.gt, 24);
    } else if (gt.type === "interval") {
      addIntervalMarker(timeline, gt, example.duration, COLORS.gt, 44);
    }
  });

  example.predictions.forEach((prediction, index) => {
    if (prediction.type === "text") {
      return;
    }

    const color = COLORS[prediction.kind] || COLORS.other;
    const label = `${prediction.model}: ${prediction.text}`;

    if (prediction.type === "point") {
      addPointMarker(
        timeline,
        {
          time: prediction.time,
          label
        },
        example.duration,
        color,
        52 + index * 30
      );
    } else if (prediction.type === "interval") {
      addIntervalMarker(
        timeline,
        {
          start: prediction.start,
          end: prediction.end,
          label
        },
        example.duration,
        color,
        72 + index * 28
      );
    }
  });
}

function renderDemoCard(example, index) {
  const card = document.createElement("article");
  card.className = "demo-card";

  card.innerHTML = `
    <div class="demo-card-header">
      <div>
        <div class="demo-task">${escapeHtml(example.task || "Example")}</div>
        <h3>${escapeHtml(example.title || `Example ${index + 1}`)}</h3>
      </div>
      ${
        example.audio_id
          ? `<div class="audio-id">Audio ID: ${escapeHtml(example.audio_id)}</div>`
          : ""
      }
    </div>

    <div class="demo-layout">
      <div class="panel">
        <p class="question-label">Question</p>
        <h3 class="demo-question">${escapeHtml(example.question)}</h3>

        <div class="ground-truth-box">
          <strong>Ground truth</strong>
          <p>${escapeHtml(example.ground_truth_text)}</p>
        </div>

        ${
          example.observation
            ? `<div class="example-observation">${escapeHtml(example.observation)}</div>`
            : ""
        }

        <table class="prediction-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Prediction</th>
              <th>Score / Error</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="panel">
        <audio controls preload="metadata" src="${escapeHtml(example.audio)}"></audio>
        <div class="timeline"></div>
      </div>
    </div>
  `;

  const predictionTable = card.querySelector(".prediction-table tbody");
  const timeline = card.querySelector(".timeline");

  renderPredictionRows(predictionTable, example.predictions || []);
  renderTimeline(timeline, example);

  return card;
}

function renderAllDemos(demos) {
  const container = document.getElementById("demoExamples");
  container.innerHTML = "";

  demos.forEach((example, index) => {
    container.appendChild(renderDemoCard(example, index));
  });
}

function getModelTypeClass(type) {
  const normalized = String(type).toLowerCase();

  if (normalized.includes("ours")) {
    return "type-ours";
  }

  if (normalized.includes("open")) {
    return "type-open";
  }

  if (normalized.includes("closed")) {
    return "type-closed";
  }

  return "";
}

function formatScore(value) {
  if (value === null || value === undefined || value === "--") {
    return "-";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return number.toFixed(1);
}

function renderLeaderboard(rows) {
  const container = document.getElementById("leaderboard");

  const sorted = [...rows].sort((a, b) => b.overall - a.overall);

  const body = sorted
    .map((row, index) => {
      const typeClass = getModelTypeClass(row.type);

      return `
        <tr class="${typeClass}">
          <td>${index + 1}</td>
          <td><strong>${row.model}</strong></td>
          <td>${row.type}</td>
          <td>${row.size ?? "-"}</td>
          <td>${formatScore(row.tsg)}</td>
          <td>${formatScore(row.ltr)}</td>
          <td>${formatScore(row.tad)}</td>
          <td>${formatScore(row.gto)}</td>
          <td>${formatScore(row.mtr)}</td>
          <td><strong>${formatScore(row.overall)}</strong></td>
        </tr>
      `;
    })
    .join("");

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Model</th>
          <th>Type</th>
          <th>Size</th>
          <th>TSG</th>
          <th>LTR</th>
          <th>TAD</th>
          <th>GTO</th>
          <th>MTR</th>
          <th>Overall</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

async function main() {
  try {
    const [tasks, demos, leaderboard] = await Promise.all([
      loadJson("data/tasks.json"),
      loadJson("data/demos.json"),
      loadJson("data/leaderboard.json")
    ]);

    renderTasks(tasks);
    renderAllDemos(demos);
    renderLeaderboard(leaderboard);
  } catch (error) {
    console.error(error);
    alert("Failed to load website data. Check JSON file paths.");
  }
}

main();
