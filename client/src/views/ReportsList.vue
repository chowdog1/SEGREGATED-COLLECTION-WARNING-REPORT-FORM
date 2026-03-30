<template>
  <div class="main-wrap">
    <!-- Date range toolbar -->
    <div class="toolbar">
      <div class="toolbar-group">
        <label class="field-label" for="fromDate">View From</label>
        <input type="date" id="fromDate" v-model="dateFrom" />
      </div>
      <div class="toolbar-group">
        <label class="field-label" for="toDate">View To</label>
        <input type="date" id="toDate" v-model="dateTo" />
      </div>
      <button class="btn btn-primary" @click="loadReports(1)">
        Load Records
      </button>
      <span class="count-badge"
        >{{ totalCount }} record{{ totalCount !== 1 ? "s" : "" }}</span
      >
      <button
        class="btn btn-gold"
        style="margin-left: auto"
        @click="exportModal = true"
      >
        Export to Excel
      </button>
    </div>

    <!-- Search & filter bar -->
    <div class="filter-bar">
      <div class="search-wrap">
        <span class="search-icon">🔎</span>
        <input
          type="text"
          v-model="filters.search"
          placeholder="Search by first or last name…"
          @input="onSearchInput"
        />
        <button v-if="filters.search" class="search-clear" @click="clearSearch">
          ×
        </button>
      </div>
      <div class="filter-group">
        <select
          v-model="filters.barangay"
          @change="applyFilters"
          :class="{ active: filters.barangay }"
        >
          <option value="">All Barangays</option>
          <option v-for="b in BARANGAYS" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>
      <div class="filter-group">
        <select
          v-model="filters.officer"
          @change="applyFilters"
          :class="{ active: filters.officer }"
        >
          <option value="">All Officers</option>
          <option v-for="o in OFFICERS" :key="o" :value="o">{{ o }}</option>
        </select>
      </div>
      <div class="filter-group">
        <select
          v-model="filters.violation"
          @change="applyFilters"
          :class="{ active: filters.violation }"
        >
          <option value="">All Violations</option>
          <option v-for="v in VIOLATIONS" :key="v.key" :value="v.key">
            {{ v.code }} {{ v.desc }}
          </option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="filter-group">
        <select v-model="filters.sort" @change="applyFilters">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name_az">Name A–Z</option>
          <option value="name_za">Name Z–A</option>
        </select>
      </div>
      <button class="btn-reset" @click="resetFilters">↺ Reset</button>

      <!-- Active filter chips -->
      <div v-if="activeChips.length" class="active-filters">
        <div v-for="chip in activeChips" :key="chip.label" class="filter-chip">
          <span>{{ chip.label }}</span>
          <button @click="chip.clear">×</button>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner-sm"></div>
        <p>Loading reports…</p>
      </div>

      <div v-else-if="reports.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No reports found.</p>
      </div>

      <template v-else>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date Issued</th>
                <th>Violations</th>
                <th>Apprehended</th>
                <th>Barangay</th>
                <th>Officers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in reports" :key="r._id">
                <td>
                  <strong>{{ formatDate(r.dateIssued) }}</strong>
                </td>
                <td>
                  <span v-for="v in getViolations(r)" :key="v" class="badge">{{
                    v
                  }}</span>
                  <span v-if="!getViolations(r).length">—</span>
                </td>
                <td v-html="highlightName(r)"></td>
                <td>{{ r.barangay }}</td>
                <td class="officers-cell">
                  {{ (r.officers || []).join(", ") || "—" }}
                </td>
                <td style="white-space: nowrap">
                  <button class="btn-view" @click="openDetail(r._id)">
                    View
                  </button>
                  <button
                    class="btn-del"
                    @click="
                      openPinModal(
                        r._id,
                        `${r.apprehendedLastName}, ${r.apprehendedFirstName}`,
                      )
                    "
                  >
                    ✕
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination-wrap">
          <span class="page-showing">
            Showing {{ pageStart }}–{{ pageEnd }} of {{ totalCount }} record{{
              totalCount !== 1 ? "s" : ""
            }}
          </span>
          <div class="page-controls">
            <button
              class="page-nav"
              :disabled="currentPage <= 1"
              @click="loadReports(1)"
            >
              «
            </button>
            <button
              class="page-nav"
              :disabled="currentPage <= 1"
              @click="loadReports(currentPage - 1)"
            >
              ‹
            </button>
            <select
              class="page-size-select"
              v-model="pageSize"
              @change="loadReports(1)"
            >
              <option :value="10">10 per page</option>
              <option :value="25">25 per page</option>
              <option :value="50">50 per page</option>
              <option :value="100">100 per page</option>
            </select>
            <button
              class="page-nav"
              :disabled="currentPage >= totalPages"
              @click="loadReports(currentPage + 1)"
            >
              ›
            </button>
            <button
              class="page-nav"
              :disabled="currentPage >= totalPages"
              @click="loadReports(totalPages)"
            >
              »
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Detail modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="detailModal"
        class="modal-overlay"
        @click.self="detailModal = false"
      >
        <div class="modal">
          <div class="modal-header">
            <h2>Warning Report Details</h2>
            <button class="modal-close" @click="detailModal = false">×</button>
          </div>
          <div class="modal-body" v-if="detailRecord">
            <div class="detail-row">
              <div class="detail-label">Date Issued</div>
              <div class="detail-val">
                <strong>{{ formatDateLong(detailRecord.dateIssued) }}</strong>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Violations</div>
              <div class="detail-val">
                <span
                  v-for="v in getViolationsFull(detailRecord)"
                  :key="v"
                  class="badge"
                  >{{ v }}</span
                >
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Apprehended</div>
              <div class="detail-val">
                <strong
                  >{{ detailRecord.apprehendedLastName }},
                  {{ detailRecord.apprehendedFirstName }}</strong
                >
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Address</div>
              <div class="detail-val">{{ detailRecord.address }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Barangay</div>
              <div class="detail-val">{{ detailRecord.barangay }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Officers</div>
              <div class="detail-val">
                {{ (detailRecord.officers || []).join(", ") || "—" }}
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Remarks</div>
              <div class="detail-val">{{ detailRecord.remarks || "—" }}</div>
            </div>
            <div
              class="detail-row"
              v-if="detailRecord.geo && detailRecord.geo.latitude"
            >
              <div class="detail-label">Location</div>
              <div class="detail-val">
                <div class="geo-coords">
                  {{ detailRecord.geo.latitude.toFixed(6) }},
                  {{ detailRecord.geo.longitude.toFixed(6) }}
                  <span v-if="detailRecord.geo.accuracy">
                    · ~{{ Math.round(detailRecord.geo.accuracy) }}m
                    accuracy</span
                  >
                </div>
                <div ref="detailMapEl" class="detail-map"></div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Signature</div>
              <div class="detail-val">
                <img
                  v-if="detailRecord.signature"
                  :src="detailRecord.signature"
                  class="sig-img"
                  alt="Signature"
                />
                <em v-else style="color: var(--text-muted)"
                  >No signature captured</em
                >
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Photos</div>
              <div class="detail-val">
                <div
                  v-if="detailRecord.photos && detailRecord.photos.length"
                  class="photo-grid"
                >
                  <img
                    v-for="(p, i) in detailRecord.photos"
                    :key="i"
                    :src="p"
                    alt="Photo evidence"
                    class="photo-thumb"
                    @click="openLightbox(p)"
                  />
                </div>
                <em v-else style="color: var(--text-muted)">No photos</em>
              </div>
            </div>
          </div>
          <div
            v-else
            class="modal-body"
            style="text-align: center; padding: 40px"
          >
            <div class="spinner-sm"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Export modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="exportModal"
        class="modal-overlay"
        @click.self="exportModal = false"
      >
        <div class="modal modal-sm">
          <div class="modal-header">
            <h2>Export to Excel</h2>
            <button class="modal-close" @click="exportModal = false">×</button>
          </div>
          <div class="modal-body">
            <p
              style="
                font-size: 0.88rem;
                color: var(--text-muted);
                margin-bottom: 18px;
              "
            >
              Select the date range for the records you want to export. The file
              will include all fields, signatures, and photos.
            </p>
            <div class="export-fields">
              <div class="form-group-ex">
                <label class="ex-label">From</label>
                <input type="date" v-model="exportFrom" class="ex-input" />
              </div>
              <div class="form-group-ex">
                <label class="ex-label">To</label>
                <input type="date" v-model="exportTo" class="ex-input" />
              </div>
            </div>
            <div class="export-presets">
              <span class="preset-label">Quick select:</span>
              <button class="preset-btn" @click="setPreset('today')">
                Today
              </button>
              <button class="preset-btn" @click="setPreset('week')">
                This Week
              </button>
              <button class="preset-btn" @click="setPreset('month')">
                This Month
              </button>
              <button class="preset-btn" @click="setPreset('all')">
                All Time
              </button>
            </div>
            <div class="export-actions">
              <button class="btn btn-outline" @click="exportModal = false">
                Cancel
              </button>
              <button class="btn btn-primary" @click="doExport">
                Download Excel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- PIN confirmation modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="pinModal.visible"
        class="modal-overlay"
        @click.self="closePinModal"
      >
        <div class="modal modal-sm">
          <div class="modal-header" style="background: var(--red)">
            <h2>Confirm Deletion</h2>
            <button class="modal-close" @click="closePinModal">×</button>
          </div>
          <div class="modal-body pin-modal-body">
            <p class="pin-warning">
              This action is irreversible. Enter the supervisor PIN to proceed.
            </p>
            <div class="pin-record-info">
              <strong>Record to delete:</strong>
              <span>{{ pinModal.recordName }}</span>
            </div>

            <!-- PIN dot display -->
            <div class="pin-dots-wrap">
              <div class="pin-dots">
                <span
                  v-for="i in 4"
                  :key="i"
                  :class="[
                    'pin-dot',
                    i <= pinModal.pin.length ? 'filled' : '',
                    pinModal.shake ? 'shake' : '',
                  ]"
                ></span>
              </div>
              <p v-if="pinModal.error" class="pin-error">
                {{ pinModal.error }}
              </p>
              <p v-if="pinModal.loading" class="pin-checking">Verifying…</p>
            </div>

            <!-- On-screen numpad — no backspace, phone style -->
            <div class="numpad">
              <button
                v-for="key in [
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                  '',
                  '0',
                  '',
                ]"
                :key="key + Math.random()"
                :class="['numpad-key', key === '' ? 'numpad-empty' : '']"
                :disabled="key === '' || pinModal.loading"
                @click="key !== '' && numpadPress(key)"
                type="button"
              >
                {{ key }}
              </button>
            </div>

            <div style="text-align: center; margin-top: 14px">
              <button
                class="btn-pin-cancel"
                @click="closePinModal"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Lightbox -->
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="lightbox.visible"
        class="lightbox-overlay"
        @click="closeLightbox"
      >
        <button class="lightbox-close" @click="closeLightbox">✕</button>
        <img
          :src="lightbox.src"
          class="lightbox-img"
          alt="Photo enlarged"
          @click.stop
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  inject,
  onMounted,
  onUnmounted,
  nextTick,
} from "vue";
import {
  BARANGAYS,
  OFFICERS,
  VIOLATIONS,
  VIOL_LABELS,
} from "../composables/constants.js";

const showToast = inject("showToast");

// ─── State ────────────────────────────────────────────────────
const reports = ref([]);
const loading = ref(false);
const totalCount = ref(0);
const totalPages = ref(1);
const currentPage = ref(1);
const pageSize = ref(25);

function localDateString(date) {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const d30 = new Date();
d30.setDate(d30.getDate() - 30);
const dateFrom = ref(localDateString(d30));
const dateTo = ref(localDateString());

const filters = reactive({
  search: "",
  barangay: "",
  officer: "",
  violation: "",
  sort: "newest",
});

let searchTimer = null;

// ─── Detail modal ─────────────────────────────────────────────
const detailModal = ref(false);
const detailRecord = ref(null);
const detailMapEl = ref(null);
let detailMap = null;

function initDetailMap(lat, lng) {
  // Load Leaflet CSS
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const loadLeaflet = () =>
    new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = resolve;
      document.head.appendChild(s);
    });
  loadLeaflet().then(() => {
    if (detailMap) {
      detailMap.remove();
      detailMap = null;
    }
    if (!detailMapEl.value) return;
    detailMap = window.L.map(detailMapEl.value).setView([lat, lng], 17);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(detailMap);
    window.L.marker([lat, lng])
      .addTo(detailMap)
      .bindPopup("Violation location")
      .openPopup();
  });
}

// ─── Export modal ─────────────────────────────────────────────
const exportModal = ref(false);
const exportFrom = ref("");
const exportTo = ref("");

// ─── Computed ─────────────────────────────────────────────────
const pageStart = computed(() =>
  totalCount.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1,
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * pageSize.value, totalCount.value),
);

const activeChips = computed(() => {
  const chips = [];
  if (filters.search)
    chips.push({ label: `Name: "${filters.search}"`, clear: clearSearch });
  if (filters.barangay)
    chips.push({
      label: `Brgy: ${filters.barangay}`,
      clear: () => {
        filters.barangay = "";
        applyFilters();
      },
    });
  if (filters.officer)
    chips.push({
      label: `Officer: ${filters.officer.split(" ")[0]}…`,
      clear: () => {
        filters.officer = "";
        applyFilters();
      },
    });
  if (filters.violation)
    chips.push({
      label: `Violation: ${(VIOL_LABELS[filters.violation] || "Other").split(" ").slice(0, 3).join(" ")}`,
      clear: () => {
        filters.violation = "";
        applyFilters();
      },
    });
  if (filters.sort !== "newest")
    chips.push({
      label: `Sort: ${filters.sort.replace("_", " ")}`,
      clear: () => {
        filters.sort = "newest";
        applyFilters();
      },
    });
  return chips;
});

// ─── Load reports ─────────────────────────────────────────────
async function loadReports(page = 1) {
  currentPage.value = page;
  loading.value = true;

  const params = new URLSearchParams({
    page: page,
    limit: pageSize.value,
    sort: filters.sort,
  });
  if (dateFrom.value) params.set("from", dateFrom.value);
  if (dateTo.value) params.set("to", dateTo.value);
  if (filters.search) params.set("search", filters.search);
  if (filters.barangay) params.set("barangay", filters.barangay);
  if (filters.officer) params.set("officer", filters.officer);
  if (filters.violation) params.set("violation", filters.violation);

  try {
    const res = await fetch("/api/reports?" + params);
    const data = await res.json();
    reports.value = data.reports;
    totalCount.value = data.pagination.total;
    totalPages.value = data.pagination.totalPages;
    currentPage.value = data.pagination.page;
  } catch {
    showToast("Failed to load reports.", true);
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  loadReports(1);
}

function onSearchInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 350);
}

function clearSearch() {
  filters.search = "";
  applyFilters();
}
function resetFilters() {
  filters.search = "";
  filters.barangay = "";
  filters.officer = "";
  filters.violation = "";
  filters.sort = "newest";
  applyFilters();
}

// ─── View detail ──────────────────────────────────────────────
async function openDetail(id) {
  detailRecord.value = null;
  detailModal.value = true;
  if (detailMap) {
    detailMap.remove();
    detailMap = null;
  }
  try {
    const res = await fetch("/api/reports/" + id);
    detailRecord.value = await res.json();
    // Init map if geo data exists
    if (detailRecord.value.geo?.latitude) {
      await nextTick();
      initDetailMap(
        detailRecord.value.geo.latitude,
        detailRecord.value.geo.longitude,
      );
    }
  } catch {
    showToast("Failed to load record.", true);
    detailModal.value = false;
  }
}

// ─── PIN delete modal ─────────────────────────────────────────
const pinModal = reactive({
  visible: false,
  recordId: null,
  recordName: "",
  pin: "",
  error: "",
  loading: false,
  shake: false,
});

function openPinModal(id, name) {
  pinModal.visible = true;
  pinModal.recordId = id;
  pinModal.recordName = name;
  pinModal.pin = "";
  pinModal.error = "";
  pinModal.loading = false;
  pinModal.shake = false;
}

function closePinModal() {
  pinModal.visible = false;
  pinModal.pin = "";
  pinModal.error = "";
  pinModal.loading = false;
  pinModal.shake = false;
}

async function numpadPress(key) {
  if (pinModal.loading) return;
  if (pinModal.pin.length >= 4) return;
  pinModal.pin += key;
  pinModal.error = "";

  // Auto-submit when 4 digits entered
  if (pinModal.pin.length === 4) {
    await confirmDelete();
  }
}

async function confirmDelete() {
  pinModal.loading = true;
  pinModal.error = "";
  try {
    const res = await fetch("/api/reports/" + pinModal.recordId, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinModal.pin }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("Record deleted.");
      closePinModal();
      loadReports(currentPage.value);
    } else {
      // Wrong PIN — shake dots and clear
      pinModal.shake = true;
      pinModal.error = "Incorrect PIN. Try again.";
      setTimeout(() => {
        pinModal.shake = false;
        pinModal.pin = "";
        pinModal.loading = false;
      }, 600);
    }
  } catch {
    pinModal.error = "Network error. Please try again.";
    pinModal.pin = "";
    pinModal.loading = false;
  }
}

// ─── Lightbox ─────────────────────────────────────────────────
const lightbox = reactive({ visible: false, src: "" });

function openLightbox(src) {
  lightbox.src = src;
  lightbox.visible = true;
}
function closeLightbox() {
  lightbox.visible = false;
}

// Close lightbox on Escape key

// ─── Export ───────────────────────────────────────────────────
function setPreset(preset) {
  const now = new Date();
  let from,
    to = now.toISOString().split("T")[0];
  if (preset === "today") {
    from = to;
  } else if (preset === "week") {
    const s = new Date(now);
    s.setDate(now.getDate() - now.getDay());
    from = s.toISOString().split("T")[0];
  } else if (preset === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  } else if (preset === "all") {
    from = "2000-01-01";
  }
  exportFrom.value = from;
  exportTo.value = to;
}

function doExport() {
  if (!exportFrom.value || !exportTo.value) {
    showToast("Please select both dates.", true);
    return;
  }
  if (new Date(exportFrom.value) > new Date(exportTo.value)) {
    showToast("From date must be before To date.", true);
    return;
  }
  exportModal.value = false;
  showToast("Generating Excel file…");
  window.location.href = `/api/export?from=${exportFrom.value}&to=${exportTo.value}`;
}

// ─── Helpers ──────────────────────────────────────────────────
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function formatDateLong(d) {
  return new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getViolations(r) {
  return Object.entries(r.violations || {})
    .filter(([k, v]) => v && k !== "otherText")
    .map(([k]) =>
      k === "other"
        ? r.violations.otherText || "Other"
        : VIOL_LABELS[k]?.split(" ").slice(0, 3).join(" ") || k,
    );
}

function getViolationsFull(r) {
  return Object.entries(r.violations || {})
    .filter(([k, v]) => v && k !== "otherText")
    .map(([k]) =>
      k === "other" ? r.violations.otherText || "Other" : VIOL_LABELS[k] || k,
    );
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightName(r) {
  const name = `${r.apprehendedLastName}, ${r.apprehendedFirstName}`;
  if (!filters.search) return name;
  return name.replace(
    new RegExp(`(${escapeRegex(filters.search)})`, "gi"),
    "<mark>$1</mark>",
  );
}

onMounted(() => {
  exportFrom.value = dateFrom.value;
  exportTo.value = dateTo.value;
  loadReports(1);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
});

onUnmounted(() => {
  if (detailMap) {
    detailMap.remove();
    detailMap = null;
  }
});
</script>

<style scoped>
.main-wrap {
  max-width: 1100px;
  margin: 28px auto;
  padding: 0 16px 48px;
}

/* Toolbar */
.toolbar {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-group .field-label {
  margin-bottom: 0;
  white-space: nowrap;
}
.toolbar input[type="date"] {
  border: 1.5px solid var(--border);
  border-radius: 5px;
  padding: 7px 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.88rem;
  background: var(--surface);
}
.toolbar input[type="date"]:focus {
  outline: none;
  border-color: var(--green-mid);
}
.count-badge {
  background: var(--green-pale);
  border: 1px solid var(--border);
  color: var(--green-dark);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Filter bar */
.filter-bar {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 200px;
}
.search-icon {
  position: absolute;
  left: 10px;
  font-size: 0.85rem;
  pointer-events: none;
}
.search-wrap input[type="text"] {
  padding: 8px 32px 8px 32px;
  border: 1.5px solid var(--border);
  border-radius: 5px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.88rem;
  background: var(--surface);
  width: 100%;
  transition: border-color 0.2s;
}
.search-wrap input:focus {
  outline: none;
  border-color: var(--green-mid);
  box-shadow: 0 0 0 3px rgba(46, 107, 71, 0.1);
}
.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  font-size: 1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}
.search-clear:hover {
  color: var(--red);
  background: #fdecea;
}
.filter-group select {
  border: 1.5px solid var(--border);
  border-radius: 5px;
  padding: 8px 10px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.82rem;
  background: var(--surface);
  cursor: pointer;
  min-width: 140px;
  transition: border-color 0.2s;
}
.filter-group select:focus {
  outline: none;
  border-color: var(--green-mid);
}
.filter-group select.active {
  border-color: var(--green-mid);
  background: var(--green-pale);
  color: var(--green-dark);
  font-weight: 600;
}
.btn-reset {
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 5px;
  padding: 7px 14px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.82rem;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-reset:hover {
  border-color: var(--green-mid);
  color: var(--green-dark);
  background: var(--green-pale);
}
.active-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  margin-top: 4px;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--green-pale);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--green-dark);
}
.filter-chip button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--green-mid);
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
}
.filter-chip button:hover {
  color: var(--red);
}

/* Table */
.table-wrap {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}
.table-scroll {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}
thead {
  background: var(--green-dark);
  color: white;
}
th {
  padding: 12px 14px;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 600;
  white-space: nowrap;
}
td {
  padding: 11px 14px;
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
.officers-cell {
  max-width: 180px;
  white-space: normal;
  font-size: 0.78rem;
}

.loading-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty-state {
  text-align: center;
  padding: 56px 24px;
  color: var(--text-muted);
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.btn-view {
  background: none;
  border: 1.5px solid var(--green-mid);
  color: var(--green-mid);
  border-radius: 4px;
  padding: 5px 11px;
  font-size: 0.78rem;
  font-family: "DM Sans", sans-serif;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-view:hover {
  background: var(--green-mid);
  color: white;
}
.btn-del {
  background: none;
  border: 1.5px solid #f5c6c2;
  color: var(--red);
  border-radius: 4px;
  padding: 5px 9px;
  font-size: 0.78rem;
  font-family: "DM Sans", sans-serif;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  margin-left: 5px;
}
.btn-del:hover {
  background: #fdecea;
}

/* Pagination */
.pagination-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 10px;
}
.page-showing {
  font-size: 0.82rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.page-nav {
  background: white;
  border: 1px solid var(--border);
  border-radius: 4px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.page-nav:hover:not(:disabled) {
  border-color: var(--green-mid);
  color: var(--green-dark);
  background: var(--green-pale);
}
.page-nav:disabled {
  opacity: 0.3;
  cursor: default;
}
.page-size-select {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.82rem;
  height: 30px;
  cursor: pointer;
}
.page-size-select:focus {
  outline: none;
  border-color: var(--green-mid);
}

/* Export modal */
.export-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}
.form-group-ex {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ex-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.ex-input {
  border: 1.5px solid var(--border);
  border-radius: 5px;
  padding: 9px 12px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.9rem;
  background: var(--surface);
  width: 100%;
}
.ex-input:focus {
  outline: none;
  border-color: var(--green-mid);
  box-shadow: 0 0 0 3px rgba(46, 107, 71, 0.12);
}
.export-presets {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding: 12px 14px;
  background: var(--surface);
  border-radius: 6px;
  border: 1px solid var(--border);
}
.preset-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.preset-btn {
  background: white;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  padding: 4px 12px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.preset-btn:hover {
  border-color: var(--green-mid);
  color: var(--green-dark);
  background: var(--green-pale);
}
.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .export-fields {
    grid-template-columns: 1fr;
  }
}

/* PIN delete modal */
.pin-modal-body {
  text-align: center;
}
.pin-warning {
  font-size: 0.82rem;
  color: var(--red);
  background: #fdecea;
  border: 1px solid #f5c6c2;
  border-radius: 5px;
  padding: 9px 14px;
  margin-bottom: 14px;
  font-weight: 500;
  text-align: left;
}
.pin-record-info {
  font-size: 0.85rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 10px 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}
.pin-record-info strong {
  color: var(--text-muted);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pin-record-info span {
  color: var(--text);
  font-weight: 600;
}

/* PIN dots display */
.pin-dots-wrap {
  margin-bottom: 20px;
}
.pin-dots {
  display: inline-flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 8px;
}
.pin-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: white;
  transition:
    background 0.15s,
    border-color 0.15s,
    transform 0.15s;
  display: inline-block;
}
.pin-dot.filled {
  background: var(--red);
  border-color: var(--red);
  transform: scale(1.15);
}
/* Shake animation on wrong PIN */
.pin-dot.shake {
  animation: pin-shake 0.5s ease;
}
@keyframes pin-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  15% {
    transform: translateX(-6px);
  }
  30% {
    transform: translateX(6px);
  }
  45% {
    transform: translateX(-5px);
  }
  60% {
    transform: translateX(5px);
  }
  75% {
    transform: translateX(-3px);
  }
  90% {
    transform: translateX(3px);
  }
}
.pin-error {
  font-size: 0.78rem;
  color: var(--red);
  font-weight: 600;
  margin-top: 4px;
  min-height: 18px;
}
.pin-checking {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 4px;
  min-height: 18px;
}

/* Numpad */
.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 0 auto;
  max-width: 220px;
}
.numpad-key {
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 50%;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  font-family: "DM Sans", sans-serif;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: all 0.12s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.numpad-key:hover:not(:disabled):not(.numpad-empty) {
  background: var(--green-pale);
  border-color: var(--green-mid);
  color: var(--green-dark);
}
.numpad-key:active:not(:disabled):not(.numpad-empty) {
  transform: scale(0.88);
  background: var(--green-dark);
  border-color: var(--green-dark);
  color: white;
}
.numpad-empty {
  visibility: hidden;
  pointer-events: none;
}
.numpad-key:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-pin-cancel {
  background: none;
  border: none;
  font-family: "DM Sans", sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px 20px;
  border-radius: 4px;
  transition: color 0.2s;
}
.btn-pin-cancel:hover {
  color: var(--red);
}

/* Geo / map in detail modal */
.geo-coords {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-family: monospace;
}
.detail-map {
  width: 100%;
  height: 200px;
  border-radius: 6px;
  border: 1px solid var(--border);
  overflow: hidden;
  z-index: 0;
}

/* Photo thumbnail — clickable */
.photo-thumb {
  cursor: zoom-in;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.photo-thumb:hover {
  transform: scale(1.04);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Lightbox */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: zoom-out;
}
.lightbox-img {
  max-width: 90vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 8px 48px rgba(0, 0, 0, 0.5);
  cursor: default;
}
.lightbox-close {
  position: fixed;
  top: 16px;
  right: 20px;
  background: rgba(255, 255, 255, 0.12);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  color: white;
  font-size: 1.1rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  z-index: 10000;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* Lightbox transition */
.lightbox-fade-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.lightbox-fade-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.lightbox-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}
.lightbox-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
