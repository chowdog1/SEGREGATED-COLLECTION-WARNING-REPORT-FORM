const VIOL_LABELS = {
  co3504: "C.O 35-04 Unsegregated Waste",
  co911: "C.O 9-11 Littering/Illegal Disposal",
  co1424ab: "C.O 14-24 (A&B) Smoking",
  co1424rest: "C.O 14-24 (C-V,X,Y,Z) Person in Charge",
  co1011: "C.O 10-11 Illegal Dumping to Waterways",
};

const OFFICERS = [
  "Aileen Lachica",
  "Marielle Ybañez",
  "Dwight Babagay",
  "Charlotte Chan",
  "Julius Cezar Pangan",
  "John Paul Florida",
  "Abraham Magturo",
  "Angelita Pimentel",
  "Abegail De Asis",
  "Genevieve Delos Santos",
  "Carmencita Valdemoro",
  "Anna Pacheco",
  "Gema Dequiña",
  "Princess Eduarte",
  "Rodel Pamintuan",
  "Gladilien Landoy",
  "Antonio Palanca",
  "Gina Terana",
  "Alfa Teodosio",
  "Michelle Añora Mendoza",
  "Joynalyn Collado",
  "Rosario Jantar",
  "Danalyn De Asis",
  "Maria Luisa Brazil",
];

// Populate officer filter dropdown
const officerSelect = document.getElementById("filterOfficer");
OFFICERS.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  officerSelect.appendChild(opt);
});

// Default date range: last 30 days
const today = new Date();
const d30 = new Date();
d30.setDate(d30.getDate() - 30);
document.getElementById("toDate").value = today.toISOString().split("T")[0];
document.getElementById("fromDate").value = d30.toISOString().split("T")[0];

// ─── State ────────────────────────────────────────────────────
let PAGE_SIZE = 25;
let currentPage = 1;
let totalPages = 1;
let totalCount = 0;
let searchDebounceTimer = null;

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, error = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = error ? "error" : "";
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => t.classList.remove("show"), 4000);
}

// ─── Build query params from current UI state ─────────────────
function buildParams(page) {
  const params = new URLSearchParams();
  params.set("page", page || currentPage);
  params.set("limit", PAGE_SIZE);
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const search = document.getElementById("searchInput").value.trim();
  const barangay = document.getElementById("filterBarangay").value;
  const officer = document.getElementById("filterOfficer").value;
  const violation = document.getElementById("filterViolation").value;
  const sort = document.getElementById("filterSort").value;

  if (search) params.set("search", search);
  if (barangay) params.set("barangay", barangay);
  if (officer) params.set("officer", officer);
  if (violation) params.set("violation", violation);
  if (sort) params.set("sort", sort);

  return params;
}

// ─── Load reports from server ─────────────────────────────────
async function loadReports(page) {
  page = page || 1;
  currentPage = page;

  document.getElementById("loading").style.display = "block";
  document.getElementById("reportsTable").style.display = "none";
  document.getElementById("emptyState").style.display = "none";

  try {
    const params = buildParams(page);
    const res = await fetch("/api/reports?" + params.toString());
    const data = await res.json();

    totalCount = data.pagination.total;
    totalPages = data.pagination.totalPages;
    currentPage = data.pagination.page;

    updateActiveFilterChips();
    renderTable(data.reports);
    renderPagination();
  } catch (err) {
    showToast("Failed to load reports.", true);
  } finally {
    document.getElementById("loading").style.display = "none";
  }
}

// ─── applyFilters resets to page 1 ───────────────────────────
function applyFilters() {
  const search = document.getElementById("searchInput").value.trim();
  document
    .getElementById("searchClear")
    .classList.toggle("visible", search.length > 0);
  ["filterBarangay", "filterOfficer", "filterViolation"].forEach((id) => {
    document
      .getElementById(id)
      .classList.toggle("active", document.getElementById(id).value !== "");
  });
  loadReports(1);
}

// Debounce search input so it doesn't fire on every keystroke
function onSearchInput() {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(applyFilters, 350);
  const search = document.getElementById("searchInput").value.trim();
  document
    .getElementById("searchClear")
    .classList.toggle("visible", search.length > 0);
}

// ─── Render table rows ────────────────────────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTable(reports) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  document.getElementById("countBadge").textContent =
    totalCount + " record" + (totalCount !== 1 ? "s" : "");

  if (reports.length === 0) {
    document.getElementById("reportsTable").style.display = "none";
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  document.getElementById("reportsTable").style.display = "table";
  document.getElementById("emptyState").style.display = "none";

  const search = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();

  reports.forEach((r) => {
    const viols = Object.entries(r.violations || {})
      .filter(([k, v]) => v && k !== "otherText")
      .map(([k]) => {
        if (k === "other") return r.violations.otherText || "Other";
        return VIOL_LABELS[k]
          ? VIOL_LABELS[k].split(" ").slice(0, 3).join(" ")
          : k;
      });

    const officers = (r.officers || []).join(", ");
    const date = new Date(r.dateIssued).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const fullName = `${r.apprehendedLastName}, ${r.apprehendedFirstName}`;
    const displayName = search
      ? fullName.replace(
          new RegExp(`(${escapeRegex(search)})`, "gi"),
          "<mark>$1</mark>",
        )
      : fullName;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${date}</strong></td>
      <td>${viols.map((v) => `<span class="badge">${v}</span>`).join(" ") || "—"}</td>
      <td>${displayName}</td>
      <td>${r.barangay}</td>
      <td style="max-width:180px;white-space:normal;font-size:0.78rem;">${officers || "—"}</td>
      <td style="white-space:nowrap;">
        <button class="btn-view" onclick="viewReport('${r._id}')">View</button>
        <button class="btn-del" onclick="deleteReport('${r._id}', this)" title="Delete">✕</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ─── Pagination UI ────────────────────────────────────────────
function renderPagination() {
  const wrap = document.getElementById("paginationWrap");
  const showing = document.getElementById("pageShowing");
  const btnFirst = document.getElementById("btnFirst");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnLast = document.getElementById("btnLast");

  // Always show pagination bar
  wrap.style.display = "flex";

  // "Showing X-Y of Z records"
  const start = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalCount);
  showing.textContent = `Showing ${start}–${end} of ${totalCount} record${totalCount !== 1 ? "s" : ""}`;

  btnFirst.disabled = currentPage <= 1;
  btnPrev.disabled = currentPage <= 1;
  btnNext.disabled = currentPage >= totalPages;
  btnLast.disabled = currentPage >= totalPages;
}

function onPageSizeChange() {
  PAGE_SIZE = parseInt(document.getElementById("pageSizeSelect").value);
  loadReports(1);
}

function getPageRange(current, total, window) {
  const pages = new Set([1, total]);
  const half = Math.floor(window / 2);
  for (
    let i = Math.max(1, current - half);
    i <= Math.min(total, current + half);
    i++
  ) {
    pages.add(i);
  }
  return [...pages].sort((a, b) => a - b);
}

function prevPage() {
  if (currentPage > 1) loadReports(currentPage - 1);
}
function nextPage() {
  if (currentPage < totalPages) loadReports(currentPage + 1);
}

// ─── Active filter chips ──────────────────────────────────────
function updateActiveFilterChips() {
  const container = document.getElementById("activeFilters");
  container.innerHTML = "";

  const search = document.getElementById("searchInput").value.trim();
  const barangay = document.getElementById("filterBarangay").value;
  const officer = document.getElementById("filterOfficer").value;
  const violation = document.getElementById("filterViolation").value;
  const sort = document.getElementById("filterSort").value;

  const chips = [];
  if (search)
    chips.push({ label: `Name: "${search}"`, clear: "clearSearch()" });
  if (barangay)
    chips.push({
      label: `Brgy: ${barangay}`,
      clear: `document.getElementById('filterBarangay').value='';applyFilters()`,
    });
  if (officer)
    chips.push({
      label: `Officer: ${officer.split(" ")[0]}…`,
      clear: `document.getElementById('filterOfficer').value='';applyFilters()`,
    });
  if (violation)
    chips.push({
      label: `Violation: ${(VIOL_LABELS[violation] || "Other").split(" ").slice(0, 3).join(" ")}`,
      clear: `document.getElementById('filterViolation').value='';applyFilters()`,
    });
  if (sort !== "newest")
    chips.push({
      label: `Sort: ${sort.replace("_", " ")}`,
      clear: `document.getElementById('filterSort').value='newest';applyFilters()`,
    });

  container.classList.toggle("visible", chips.length > 0);
  chips.forEach((chip) => {
    const div = document.createElement("div");
    div.className = "filter-chip";
    div.innerHTML = `<span>${chip.label}</span><button onclick="${chip.clear}">×</button>`;
    container.appendChild(div);
  });
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  applyFilters();
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("filterBarangay").value = "";
  document.getElementById("filterOfficer").value = "";
  document.getElementById("filterViolation").value = "";
  document.getElementById("filterSort").value = "newest";
  applyFilters();
}

// ─── View report modal ────────────────────────────────────────
async function viewReport(id) {
  try {
    const res = await fetch("/api/reports/" + id);
    const r = await res.json();
    const date = new Date(r.dateIssued).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const fullName = `${r.apprehendedLastName}, ${r.apprehendedFirstName}`;

    const viols = Object.entries(r.violations || {})
      .filter(([k, v]) => v && k !== "otherText")
      .map(([k]) =>
        k === "other" ? r.violations.otherText || "Other" : VIOL_LABELS[k] || k,
      );

    let sigHtml = r.signature
      ? `<img src="${r.signature}" class="sig-img" alt="Signature"/>`
      : '<em style="color:var(--text-muted)">No signature captured</em>';

    let photosHtml = '<em style="color:var(--text-muted)">No photos</em>';
    if (r.photos && r.photos.length > 0) {
      photosHtml =
        '<div class="photo-grid">' +
        r.photos.map((p) => `<img src="${p}" alt="Photo evidence"/>`).join("") +
        "</div>";
    }

    document.getElementById("modalBody").innerHTML = `
      <div class="detail-row"><div class="detail-label">Date Issued</div><div class="detail-val"><strong>${date}</strong></div></div>
      <div class="detail-row"><div class="detail-label">Violations</div><div class="detail-val">${viols.map((v) => `<span class="badge">${v}</span>`).join(" ") || "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Apprehended</div><div class="detail-val"><strong>${fullName}</strong></div></div>
      <div class="detail-row"><div class="detail-label">Address</div><div class="detail-val">${r.address}</div></div>
      <div class="detail-row"><div class="detail-label">Barangay</div><div class="detail-val">${r.barangay}</div></div>
      <div class="detail-row"><div class="detail-label">Officers</div><div class="detail-val">${(r.officers || []).join(", ") || "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Remarks</div><div class="detail-val">${r.remarks || "—"}</div></div>
      <div class="detail-row"><div class="detail-label">Signature</div><div class="detail-val">${sigHtml}</div></div>
      <div class="detail-row"><div class="detail-label">Photos</div><div class="detail-val">${photosHtml}</div></div>
    `;
    document.getElementById("detailModal").classList.add("active");
  } catch (e) {
    showToast("Failed to load report details.", true);
  }
}

function closeModal() {
  document.getElementById("detailModal").classList.remove("active");
}
document.getElementById("detailModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("detailModal")) closeModal();
});

// ─── Delete report ────────────────────────────────────────────
async function deleteReport(id, btn) {
  if (!confirm("Delete this report? This cannot be undone.")) return;
  try {
    await fetch("/api/reports/" + id, { method: "DELETE" });
    showToast("Report deleted.");
    loadReports(currentPage);
  } catch (e) {
    showToast("Failed to delete report.", true);
  }
}

// ─── Export modal ─────────────────────────────────────────────
function openExportModal() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  if (from) document.getElementById("exportFrom").value = from;
  if (to) document.getElementById("exportTo").value = to;
  document.getElementById("exportModal").classList.add("active");
}

function closeExportModal() {
  document.getElementById("exportModal").classList.remove("active");
}

document.getElementById("exportModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("exportModal")) closeExportModal();
});

function setExportPreset(preset) {
  const now = new Date();
  let from,
    to = now.toISOString().split("T")[0];
  if (preset === "today") {
    from = to;
  } else if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    from = start.toISOString().split("T")[0];
  } else if (preset === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  } else if (preset === "all") {
    from = "2000-01-01";
  }
  document.getElementById("exportFrom").value = from;
  document.getElementById("exportTo").value = to;
}

async function doExport() {
  const from = document.getElementById("exportFrom").value;
  const to = document.getElementById("exportTo").value;
  if (!from || !to) {
    showToast("Please select both From and To dates.", true);
    return;
  }
  if (new Date(from) > new Date(to)) {
    showToast("From date must be before To date.", true);
    return;
  }
  closeExportModal();
  showToast("⏳ Generating Excel file…");
  window.location.href = `/api/export?from=${from}&to=${to}`;
}

// ─── Initial load ─────────────────────────────────────────────
loadReports(1);
