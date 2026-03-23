// ─── Officers list ────────────────────────────────────────────
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

const grid = document.querySelector(".officers-grid");
OFFICERS.forEach((name) => {
  const id = "off_" + name.replace(/\s+/g, "_");
  grid.innerHTML += `
    <label class="officer-item" id="wrap_${id}">
      <input type="checkbox" name="officers" value="${name}" onchange="toggleOfficer(this,'wrap_${id}')"/>
      <span>${name}</span>
    </label>`;
});

// ─── Violation toggle ─────────────────────────────────────────
function toggleViol(cb, wrapId) {
  document.getElementById(wrapId).classList.toggle("checked", cb.checked);
}
function toggleOfficer(cb, wrapId) {
  document.getElementById(wrapId).classList.toggle("checked", cb.checked);
}
function toggleOther(cb) {
  document.getElementById("otherTextWrap").style.display = cb.checked
    ? "block"
    : "none";
}

// ─── Set today's date ─────────────────────────────────────────
document.getElementById("dateIssued").value = new Date()
  .toISOString()
  .split("T")[0];

// ─── Signature Canvas ─────────────────────────────────────────
const canvas = document.getElementById("sigCanvas");
const ctx = canvas.getContext("2d");
let drawing = false;
let hasSignature = false;
let sigSnapshot = null;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = 180;

  if (hasSignature) {
    sigSnapshot = canvas.toDataURL();
  }

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.scale(dpr, dpr);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (sigSnapshot) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0, w, h);
    img.src = sigSnapshot;
  }
}
resizeCanvas();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeCanvas, 150);
});

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  ctx.beginPath();
  const p = getPos(e);
  ctx.moveTo(p.x, p.y);
});
canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  hasSignature = true;
  sigSnapshot = null;
});
canvas.addEventListener("mouseup", () => {
  drawing = false;
});
canvas.addEventListener("mouseleave", () => {
  drawing = false;
});
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    drawing = true;
    ctx.beginPath();
    const p = getPos(e);
    ctx.moveTo(p.x, p.y);
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasSignature = true;
    sigSnapshot = null;
  },
  { passive: false },
);
canvas.addEventListener("touchend", () => {
  drawing = false;
});

function clearSignature() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasSignature = false;
  sigSnapshot = null;
}

// ─── Photo preview ────────────────────────────────────────────
function previewPhoto(input, prevId, slotId) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById(prevId);
    img.src = e.target.result;
    img.style.display = "block";
    const slot = document.getElementById(slotId);
    slot.querySelector(".slot-icon").style.display = "none";
    slot.querySelector(".slot-label").style.display = "none";
  };
  reader.readAsDataURL(file);
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, error = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = error ? "error" : "";
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => t.classList.remove("show"), 4000);
}

// ─── Form submit ──────────────────────────────────────────────
document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const anyViol = document.querySelectorAll(
    ".violations-grid input[type=checkbox]:checked",
  );
  if (anyViol.length === 0) {
    showToast("Please select at least one violation.", true);
    return;
  }

  if (hasSignature) {
    document.getElementById("signatureData").value =
      canvas.toDataURL("image/png");
  }

  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.add("active");

  const formData = new FormData(e.target);

  try {
    const resp = await fetch("/api/reports", {
      method: "POST",
      body: formData,
    });
    const data = await resp.json();
    overlay.classList.remove("active");
    if (data.success) {
      showToast("✅ Report submitted successfully!");
      setTimeout(() => {
        e.target.reset();
        clearSignature();
        ["prev1", "prev2"].forEach((id) => {
          const img = document.getElementById(id);
          img.src = "";
          img.style.display = "none";
        });
        ["slot1", "slot2"].forEach((id) => {
          const s = document.getElementById(id);
          s.querySelector(".slot-icon").style.display = "";
          s.querySelector(".slot-label").style.display = "";
        });
        document
          .querySelectorAll(".viol-item.checked, .officer-item.checked")
          .forEach((el) => el.classList.remove("checked"));
        document.getElementById("otherTextWrap").style.display = "none";
        document.getElementById("dateIssued").value = new Date()
          .toISOString()
          .split("T")[0];
      }, 1200);
    } else {
      showToast("Error: " + data.error, true);
    }
  } catch (err) {
    overlay.classList.remove("active");
    showToast("Network error. Please try again.", true);
  }
});
