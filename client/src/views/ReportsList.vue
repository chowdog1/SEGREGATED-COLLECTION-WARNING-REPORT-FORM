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
          v-model="filters.disposal"
          @change="applyFilters"
          :class="{ active: filters.disposal }"
        >
          <option value="">All Classifications</option>
          <option v-for="d in DISPOSAL_TYPES" :key="d.key" :value="d.key">
            {{ d.label }}
          </option>
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
                <th>Classification</th>
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
                  <span
                    v-for="d in getDisposalTypes(r)"
                    :key="d"
                    class="badge"
                    >{{ d }}</span
                  >
                  <span v-if="!getDisposalTypes(r).length">—</span>
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
            <div style="display: flex; align-items: center; gap: 8px">
              <button
                v-if="detailRecord"
                class="btn-print"
                @click="handlePrint(detailRecord)"
                :disabled="generatingPdf"
                title="Save as PDF"
              >
                {{ generatingPdf ? "⏳ Generating…" : "📄 Save as PDF" }}
              </button>
              <button class="modal-close" @click="detailModal = false">
                ×
              </button>
            </div>
          </div>
          <div class="modal-body" v-if="detailRecord">
            <div class="detail-row">
              <div class="detail-label">Date Issued</div>
              <div class="detail-val">
                <strong>{{ formatDateLong(detailRecord.dateIssued) }}</strong>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Classification</div>
              <div class="detail-val">
                <span
                  v-for="d in getDisposalTypesFull(detailRecord)"
                  :key="d"
                  class="badge"
                  >{{ d }}</span
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
  DISPOSAL_TYPES,
  DISPOSAL_LABELS,
} from "../composables/constants.js";

// ─── Classification helpers ───────────────────────────────────
function getDisposalTypes(r) {
  if (!r || !r.disposalTypes) return [];
  return Object.entries(r.disposalTypes)
    .filter(([, v]) => v)
    .map(([k]) => DISPOSAL_LABELS[k] || k);
}

function getDisposalTypesFull(r) {
  if (!r || !r.disposalTypes) return [];
  return Object.entries(r.disposalTypes)
    .filter(([, v]) => v)
    .map(([k]) => DISPOSAL_LABELS[k] || k);
}

// ─── Highlight search in name (for v-html) ────────────────────
function highlightName(r) {
  if (!r) return "—";
  const fullName = `${r.apprehendedLastName || ""}, ${r.apprehendedFirstName || ""}`;
  if (!filters.search) return fullName;
  const search = filters.search.trim().toLowerCase();
  if (!search) return fullName;
  try {
    const regex = new RegExp(`(${search})`, "gi");
    return fullName.replace(
      regex,
      `<mark style="background:#ffe58a;padding:0 2px;border-radius:2px;">$1</mark>`,
    );
  } catch {
    return fullName;
  }
}

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
  disposal: "",
  sort: "newest",
});

let searchTimer = null;

// ─── Detail modal ─────────────────────────────────────────────
const detailModal = ref(false);
const detailRecord = ref(null);
const detailMapEl = ref(null);
const generatingPdf = ref(false);
let detailMap = null;

async function handlePrint(r) {
  generatingPdf.value = true;
  try {
    await printReport(r);
  } finally {
    generatingPdf.value = false;
  }
}

function initDetailMap(lat, lng) {
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
  if (filters.disposal)
    chips.push({
      label: `Classification: ${DISPOSAL_LABELS[filters.disposal] || filters.disposal}`,
      clear: () => {
        filters.disposal = "";
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
  if (filters.disposal) params.set("disposal", filters.disposal);

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
  filters.disposal = "";
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
  if (pinModal.pin.length === 4) await confirmDelete();
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

// ─── Leaflet map capture for PDF ──────────────────────────────
function captureLeafletMap(lat, lng) {
  return new Promise((resolve) => {
    const loadLib = (src, check) =>
      new Promise((res) => {
        if (check()) {
          res();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.onload = res;
        document.head.appendChild(s);
      });

    loadLib(
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      () => !!window.html2canvas,
    ).then(async () => {
      if (detailMapEl.value && detailMap) {
        try {
          const canvas = await window.html2canvas(detailMapEl.value, {
            useCORS: true,
            allowTaint: true,
            scale: 2,
            logging: false,
          });
          resolve({
            data: canvas.toDataURL("image/png"),
            w: canvas.width,
            h: canvas.height,
          });
          return;
        } catch {
          /* fall through */
        }
      }

      const loadLeaflet = () =>
        new Promise((res2) => {
          if (window.L) {
            res2();
            return;
          }
          if (!document.getElementById("leaflet-css")) {
            const link = document.createElement("link");
            link.id = "leaflet-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(link);
          }
          const s = document.createElement("script");
          s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          s.onload = res2;
          document.head.appendChild(s);
        });

      await loadLeaflet();
      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-9999px;top:-9999px;width:560px;height:220px;z-index:-1;";
      document.body.appendChild(container);
      const map = window.L.map(container, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], 16);
      window.L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ).addTo(map);
      window.L.marker([lat, lng]).addTo(map);

      let waited = 0;
      const check = setInterval(async () => {
        waited += 300;
        const tilesLoaded =
          container.querySelectorAll(".leaflet-tile-loaded").length > 0;
        if (tilesLoaded || waited >= 5000) {
          clearInterval(check);
          await new Promise((r) => setTimeout(r, 400));
          try {
            const canvas = await window.html2canvas(container, {
              useCORS: true,
              allowTaint: true,
              scale: 1,
              logging: false,
            });
            resolve({
              data: canvas.toDataURL("image/png"),
              w: canvas.width,
              h: canvas.height,
            });
          } catch {
            resolve(null);
          } finally {
            map.remove();
            document.body.removeChild(container);
          }
        }
      }, 300);
    });
  });
}

// ─── Print / PDF ──────────────────────────────────────────────
async function printReport(r) {
  const disposalList = getDisposalTypesFull(r);
  const fullName = `${r.apprehendedLastName}, ${r.apprehendedFirstName}`;
  const date = formatDateLong(r.dateIssued);
  const officers = (r.officers || []).join(", ") || "—";

  const logoProxyUrl =
    "/api/proxy-image?url=" +
    encodeURIComponent(
      "https://8upload.com/image/68be3f83c9e7e/freepik_br_bb4e2098-1dee-4111-8179-ddc41996d8da.png",
    );

  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  );
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const W = 210,
    H = 297,
    ML = 16,
    MR = 16,
    CW = W - ML - MR;

  function loadImgBase64(url) {
    return new Promise(async (resolve) => {
      try {
        if (url.startsWith("data:")) {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            resolve({
              data: c.toDataURL("image/png"),
              w: img.naturalWidth,
              h: img.naturalHeight,
            });
          };
          img.onerror = () => resolve(null);
          img.src = url;
          return;
        }
        const res = await fetch(url);
        if (!res.ok) {
          resolve(null);
          return;
        }
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            resolve({
              data: c.toDataURL("image/png"),
              w: img.naturalWidth,
              h: img.naturalHeight,
            });
          };
          img.onerror = () => resolve(null);
          img.src = reader.result;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      } catch {
        resolve(null);
      }
    });
  }

  const logo = await loadImgBase64(logoProxyUrl);
  let y = 0;

  function addWatermark() {
    if (!logo) return;
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    const wmSize = 170;
    doc.addImage(
      logo.data,
      "PNG",
      (W - wmSize) / 2,
      (H - wmSize) / 2,
      wmSize,
      wmSize,
    );
    doc.restoreGraphicsState();
  }

  addWatermark();

  const LOGO_H = 28;
  if (logo) {
    const lw = (logo.w / logo.h) * LOGO_H;
    doc.addImage(logo.data, "PNG", ML, 11, lw, LOGO_H);
    const textAreaLeft = ML + lw + 4;
    const textAreaRight = W - MR;
    const textCenterX = (textAreaLeft + textAreaRight) / 2;
    const textMidY = 11 + LOGO_H / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("CITY GOVERNMENT OF SAN JUAN", textCenterX, textMidY - 3, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(
      "CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE",
      textCenterX,
      textMidY + 5,
      { align: "center" },
    );
    y = 11 + LOGO_H + 6;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("CITY GOVERNMENT OF SAN JUAN", W / 2, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("CITY ENVIRONMENT AND NATURAL RESOURCES OFFICE", W / 2, 25, {
      align: "center",
    });
    y = 32;
  }

  doc.setFillColor(26, 60, 42);
  doc.rect(ML, y, CW, 12, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("WARNING REPORT", W / 2, y + 8.5, { align: "center" });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text("Date Issued: ", ML, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text(date, ML + 22, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Barangay: ", W - MR - 50, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 26, 26);
  doc.text(r.barangay || "—", W - MR - 30, y);
  y += 4;
  doc.setDrawColor(204, 217, 210);
  doc.setLineWidth(0.3);
  doc.line(ML, y, W - MR, y);
  y += 6;

  function addField(label, value, extraH = 0) {
    const lines = doc.splitTextToSize(value, CW - 36);
    const rowH = Math.max(8 + extraH, lines.length * 5 + 4);
    if (y + rowH > H - 20) {
      doc.addPage();
      addWatermark();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(46, 107, 71);
    doc.text(label.toUpperCase(), ML, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(lines, ML + 36, y + 4);
    y += rowH;
    doc.setDrawColor(232, 240, 236);
    doc.setLineWidth(0.2);
    doc.line(ML, y, W - MR, y);
    y += 3;
  }

  addField("Classification", disposalList.join(", ") || "—");
  addField("Apprehended", fullName);
  addField("Address", r.address || "—");
  addField("Officers", officers);
  addField("Remarks", r.remarks || "—");

  if (r.geo?.latitude) {
    const lat = r.geo.latitude.toFixed(6);
    const lng = r.geo.longitude.toFixed(6);
    const acc = r.geo.accuracy
      ? ` · ~${Math.round(r.geo.accuracy)}m accuracy`
      : "";
    addField("Location", `${lat}, ${lng}${acc}`);

    const mapImg = await captureLeafletMap(r.geo.latitude, r.geo.longitude);
    if (mapImg) {
      const mw = CW;
      const mh = mw * (mapImg.h / mapImg.w);
      const clampedH = Math.min(mh, 60);
      const clampedW = clampedH * (mapImg.w / mapImg.h);
      if (y + clampedH > H - 20) {
        doc.addPage();
        addWatermark();
        y = 20;
      }
      doc.addImage(mapImg.data, "PNG", ML, y, clampedW, clampedH);
      doc.setDrawColor(204, 217, 210);
      doc.setLineWidth(0.3);
      doc.rect(ML, y, clampedW, clampedH);
      y += clampedH + 5;
    }
  }

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(46, 107, 71);
  doc.text("SIGNATURE OF APPREHENDED PERSON", ML, y);
  y += 5;

  if (r.signature) {
    const sig = await loadImgBase64(r.signature);
    if (sig) {
      const sw = 70;
      const sh = sw * (sig.h / sig.w);
      if (y + sh + 4 > H - 20) {
        doc.addPage();
        addWatermark();
        y = 20;
      }
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(204, 217, 210);
      doc.setLineWidth(0.3);
      doc.rect(ML, y, sw + 6, sh + 6, "FD");
      doc.addImage(sig.data, "PNG", ML + 3, y + 3, sw, sh);
      y += sh + 10;
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(154, 154, 154);
    doc.text("No signature captured", ML, y + 5);
    y += 12;
  }

  // Data privacy notice in PDF
  y += 2;
  const noticeText =
    "All data gathered herein is data-protected and shall not be used for any other purpose. " +
    "This information is collected and processed in strict compliance with the Data Privacy Act " +
    "of the Philippines (Republic Act No. 10173).";
  const noticeLines = doc.splitTextToSize(noticeText, CW);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text(noticeLines, ML, y);
  y += noticeLines.length * 4 + 6;

  if (r.photos && r.photos.length > 0) {
    doc.addPage();
    addWatermark();
    y = 20;

    doc.setFillColor(232, 245, 238);
    doc.setDrawColor(26, 60, 42);
    doc.setLineWidth(1.2);
    doc.line(ML, y, ML, y + 10);
    doc.rect(ML + 1.5, y, CW - 1.5, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 60, 42);
    doc.text("PHOTO EVIDENCE", ML + 6, y + 7);
    y += 16;

    const photos = r.photos.slice(0, 2);
    const loaded = await Promise.all(photos.map((p) => loadImgBase64(p)));

    if (loaded.length === 1 && loaded[0]) {
      const photo = loaded[0];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(46, 107, 71);
      doc.text("PHOTO 1", ML, y);
      y += 4;
      const maxH = 140;
      const ratio = Math.min(CW / photo.w, maxH / photo.h);
      const pw = photo.w * ratio,
        ph = photo.h * ratio;
      doc.addImage(photo.data, "PNG", ML, y, pw, ph);
      doc.setDrawColor(204, 217, 210);
      doc.setLineWidth(0.3);
      doc.rect(ML, y, pw, ph);
    } else if (loaded.length === 2) {
      const half = (CW - 6) / 2;
      const maxH = 160;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(46, 107, 71);
      doc.text("PHOTO 1", ML, y);
      doc.text("PHOTO 2", ML + half + 6, y);
      y += 4;
      let ph = 0;
      const positions = [ML, ML + half + 6];
      for (let i = 0; i < 2; i++) {
        const photo = loaded[i];
        if (!photo) continue;
        const ratio = Math.min(half / photo.w, maxH / photo.h);
        ph = Math.max(ph, photo.h * ratio);
      }
      for (let i = 0; i < 2; i++) {
        const photo = loaded[i];
        if (!photo) continue;
        const ratio = Math.min(half / photo.w, maxH / photo.h);
        const pw = photo.w * ratio,
          pph = photo.h * ratio;
        const x = positions[i];
        const yOffset = (ph - pph) / 2;
        doc.addImage(photo.data, "PNG", x, y + yOffset, pw, pph);
        doc.setDrawColor(204, 217, 210);
        doc.setLineWidth(0.3);
        doc.rect(x, y + yOffset, pw, pph);
      }
    }
  }

  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`) && window.jspdf) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    document.head.appendChild(s);
  });
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
  const filename = `CENRO_Reports_${exportFrom.value}_to_${exportTo.value}.xlsx`;
  const a = document.createElement("a");
  a.href = `/api/export?from=${exportFrom.value}&to=${exportTo.value}`;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 1000);
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

onMounted(() => {
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
/* All styles preserved from original — only label text changed in template */
.main-wrap {
  max-width: 1100px;
  margin: 28px auto;
  padding: 0 16px 48px;
}
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
.btn-print {
  background: var(--gold);
  border: none;
  border-radius: 5px;
  padding: 5px 14px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--green-dark);
  cursor: pointer;
  transition: all 0.2s;
}
.btn-print:hover {
  background: #b8963e;
}
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
@media (max-width: 600px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
  .export-fields {
    grid-template-columns: 1fr;
  }
}
</style>
