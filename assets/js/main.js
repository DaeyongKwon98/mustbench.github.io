const COLORS = {
  gt: "#111827",
  ours: "#16a34a",
  base: "#dc2626",
  other: "#2563eb"
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

function renderDemo(example) {
  document.getElementById("demoQuestion").textContent = example.question;
  document.getElementById("demoGroundTruth").textContent = example.ground_truth_text;
  document.getElementById("audioPlayer").src = example.audio;

  const table = document.getElementById("predictionTable");
  table.innerHTML = "";

  example.predictions.forEach((prediction) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${prediction.model}</strong></td>
      <td>${prediction.text}</td>
      <td>${prediction.score}</td>
    `;
    table.appendChild(row);
  });

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  example.ground_truth.forEach((gt) => {
    if (gt.type === "point") {
      addPointMarker(timeline, gt, example.duration, COLORS.gt, 24);
    } else {
      addIntervalMarker(timeline, gt, example.duration, COLORS.gt, 44);
    }
  });

  example.predictions.forEach((prediction, index) => {
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
    } else {
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

function setupDemo(demos) {
  const select = document.getElementById("demoSelect");
  select.innerHTML = "";

  demos.forEach((demo, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = demo.title;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    renderDemo(demos[Number(select.value)]);
  });

  renderDemo(demos[0]);
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
    setupDemo(demos);
    renderLeaderboard(leaderboard);
  } catch (error) {
    console.error(error);
    alert("Failed to load website data. Check JSON file paths.");
  }
}

main();
