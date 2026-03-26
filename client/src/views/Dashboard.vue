<template>
  <div class="main-wrap">
    <!-- Stat cards -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.total ?? "—" }}</div>
          <div class="stat-label">Total Reports</div>
        </div>
      </div>
      <div class="stat-card accent">
        <div class="stat-icon">📅</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.thisMonth ?? "—" }}</div>
          <div class="stat-label">This Month</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🕐</div>
        <div class="stat-body">
          <div class="stat-value">{{ stats.today ?? "—" }}</div>
          <div class="stat-label">Today</div>
        </div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="charts-row">
      <!-- Violations per Barangay -->
      <div class="chart-card wide">
        <div class="chart-title">Reports per Barangay</div>
        <div class="chart-wrap" v-if="!loading">
          <canvas ref="barangayChartEl"></canvas>
        </div>
        <div v-else class="chart-loading"><div class="spinner-sm"></div></div>
      </div>

      <!-- Violation type breakdown -->
      <div class="chart-card">
        <div class="chart-title">Violation Type Breakdown</div>
        <div class="chart-wrap donut-wrap" v-if="!loading">
          <canvas ref="violationChartEl"></canvas>
        </div>
        <div v-else class="chart-loading"><div class="spinner-sm"></div></div>
      </div>
    </div>

    <!-- Recent reports -->
    <div class="recent-card">
      <div class="chart-title">Recent Reports</div>
      <div v-if="loading" class="chart-loading">
        <div class="spinner-sm"></div>
      </div>
      <table v-else-if="stats.recentReports && stats.recentReports.length">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Barangay</th>
            <th>Violations</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in stats.recentReports" :key="r._id">
            <td>{{ formatDate(r.dateIssued) }}</td>
            <td>{{ r.apprehendedLastName }}, {{ r.apprehendedFirstName }}</td>
            <td>{{ r.barangay }}</td>
            <td>
              <span v-for="v in getViolations(r)" :key="v" class="badge">{{
                v
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state" style="padding: 24px">
        <p>No reports yet.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  onMounted,
  onActivated,
  onUnmounted,
  nextTick,
} from "vue";
import { VIOL_LABELS } from "../composables/constants.js";

const loading = ref(true);
const stats = reactive({});
const barangayChartEl = ref(null);
const violationChartEl = ref(null);
let barangayChart = null;
let violationChart = null;

const VIOL_DISPLAY = {
  co3504: "C.O 35-04",
  co911: "C.O 9-11",
  co1424ab: "C.O 14-24 (A&B)",
  co1424rest: "C.O 14-24 (C-V)",
  co1011: "C.O 10-11",
  other: "Other",
};

const CHART_COLORS = [
  "#2e6b47",
  "#4a9c68",
  "#c9a84c",
  "#1a3c2a",
  "#7fb89a",
  "#e8a020",
  "#3d8b5e",
  "#a0c4b0",
];

async function loadStats() {
  loading.value = true;

  // Destroy any existing charts before re-fetching
  // so canvas elements are clean when re-rendered
  if (barangayChart) {
    barangayChart.destroy();
    barangayChart = null;
  }
  if (violationChart) {
    violationChart.destroy();
    violationChart = null;
  }

  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    Object.assign(stats, data);

    // ✅ FIX: Set loading = false FIRST so v-if renders the canvas elements
    loading.value = false;

    // ✅ FIX: Then wait for DOM to update before drawing charts
    await nextTick();
    renderCharts();
  } catch (e) {
    console.error("Dashboard load failed", e);
    loading.value = false;
  }
}

function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

async function renderCharts() {
  await loadChartJs();
  renderBarangayChart();
  renderViolationChart();
}

function renderBarangayChart() {
  if (!barangayChartEl.value || !stats.byBarangay) return;
  if (barangayChart) {
    barangayChart.destroy();
  }

  const sorted = [...stats.byBarangay].sort((a, b) => b.count - a.count);
  const labels = sorted.map((b) => b._id || "Unknown");
  const data = sorted.map((b) => b.count);

  barangayChart = new window.Chart(barangayChartEl.value, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Reports",
          data,
          backgroundColor: "#2e6b47",
          borderRadius: 4,
          hoverBackgroundColor: "#c9a84c",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${ctx.parsed.y} report${ctx.parsed.y !== 1 ? "s" : ""}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0, font: { family: "DM Sans" } },
          grid: { color: "#e8f5ee" },
        },
        x: {
          ticks: {
            font: { family: "DM Sans", size: 11 },
            maxRotation: 45,
          },
          grid: { display: false },
        },
      },
    },
  });
}

function renderViolationChart() {
  if (!violationChartEl.value || !stats.byViolation) return;
  if (violationChart) {
    violationChart.destroy();
  }

  const entries = Object.entries(VIOL_DISPLAY)
    .map(([key, label]) => ({
      label,
      value: stats.byViolation[key] || 0,
    }))
    .filter((e) => e.value > 0);

  violationChart = new window.Chart(violationChartEl.value, {
    type: "doughnut",
    data: {
      labels: entries.map((e) => e.label),
      datasets: [
        {
          data: entries.map((e) => e.value),
          backgroundColor: CHART_COLORS.slice(0, entries.length),
          borderWidth: 2,
          borderColor: "#fff",
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "DM Sans", size: 11 },
            padding: 12,
            boxWidth: 14,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${ctx.label}: ${ctx.parsed} report${ctx.parsed !== 1 ? "s" : ""}`,
          },
        },
      },
    },
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getViolations(r) {
  return Object.entries(r.violations || {})
    .filter(([k, v]) => v && k !== "otherText")
    .map(([k]) =>
      k === "other"
        ? "Other"
        : VIOL_LABELS[k]?.split(" ").slice(0, 3).join(" ") || k,
    );
}

// Load on first mount
onMounted(loadStats);

// Re-load when navigating back (handles keep-alive if ever used)
onActivated(loadStats);

// Clean up chart instances when leaving the page
// prevents "Canvas is already in use" errors on return
onUnmounted(() => {
  if (barangayChart) {
    barangayChart.destroy();
    barangayChart = null;
  }
  if (violationChart) {
    violationChart.destroy();
    violationChart = null;
  }
});
</script>

<style scoped>
.main-wrap {
  max-width: 1100px;
  margin: 28px auto;
  padding: 0 16px 48px;
}

/* Stat cards */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}
.stat-card:hover {
  transform: translateY(-2px);
}
.stat-card.accent {
  border-left: 4px solid var(--gold);
}
.stat-icon {
  font-size: 2rem;
}
.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--green-dark);
  line-height: 1;
  font-family: "Source Serif 4", serif;
}
.stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
}

/* Charts */
.charts-row {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  margin-bottom: 20px;
}
.chart-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.chart-title {
  font-family: "Source Serif 4", serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--green-dark);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--green-pale);
}
.chart-wrap {
  height: 280px;
  position: relative;
}
.donut-wrap {
  height: 300px;
}
.chart-loading {
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Recent reports table */
.recent-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
thead {
  background: var(--green-dark);
  color: white;
  border-radius: 6px;
}
th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}
td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
tr:last-child td {
  border-bottom: none;
}
tr:nth-child(even) {
  background: var(--surface);
}
tr:hover td {
  background: var(--green-pale);
}

@media (max-width: 768px) {
  .stat-cards {
    grid-template-columns: 1fr;
  }
  .charts-row {
    grid-template-columns: 1fr;
  }
}
</style>
