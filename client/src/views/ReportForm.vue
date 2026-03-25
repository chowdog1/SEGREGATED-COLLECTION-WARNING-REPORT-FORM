<template>
  <div class="main-wrap">
    <Transition name="form-fade">
      <form v-if="formVisible" @submit.prevent="submitForm">
        <div class="form-card">
          <!-- SECTION 1: Violation Details -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">1</span> Violation Details
            </div>
            <div class="form-row" style="grid-template-columns: 220px 1fr">
              <div class="form-group">
                <label class="field-label" for="dateIssued"
                  >Date Issued <span class="req">*</span></label
                >
                <input
                  type="date"
                  id="dateIssued"
                  v-model="form.dateIssued"
                  required
                />
              </div>
            </div>

            <label
              class="field-label"
              style="margin-bottom: 10px; display: block"
            >
              Violations <span class="req">*</span>
            </label>
            <div class="violations-grid">
              <label
                v-for="v in VIOLATIONS"
                :key="v.key"
                :class="['viol-item', form.violations[v.key] ? 'checked' : '']"
              >
                <input type="checkbox" v-model="form.violations[v.key]" />
                <div class="viol-label">
                  <span class="viol-code">{{ v.code }}</span>
                  <span class="viol-desc">{{ v.desc }}</span>
                </div>
              </label>
              <label
                :class="['viol-item', form.violations.other ? 'checked' : '']"
              >
                <input type="checkbox" v-model="form.violations.other" />
                <div class="viol-label">
                  <span class="viol-code">Other</span>
                  <span class="viol-desc">Specify below</span>
                </div>
              </label>
            </div>
            <div v-if="form.violations.other" class="other-text-wrap">
              <div class="form-group">
                <label class="field-label" for="otherText"
                  >Please specify other violation</label
                >
                <input
                  type="text"
                  id="otherText"
                  :value="form.otherText"
                  @input="form.otherText = $event.target.value.toUpperCase()"
                  placeholder="Describe the violation…"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 2: Person Apprehended -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">2</span> Person Apprehended
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="field-label" for="firstName"
                  >First Name <span class="req">*</span></label
                >
                <input
                  type="text"
                  id="firstName"
                  :value="form.apprehendedFirstName"
                  @input="
                    form.apprehendedFirstName =
                      $event.target.value.toUpperCase()
                  "
                  required
                  placeholder="First name"
                />
              </div>
              <div class="form-group">
                <label class="field-label" for="lastName"
                  >Last Name <span class="req">*</span></label
                >
                <input
                  type="text"
                  id="lastName"
                  :value="form.apprehendedLastName"
                  @input="
                    form.apprehendedLastName = $event.target.value.toUpperCase()
                  "
                  required
                  placeholder="Last name"
                />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="field-label" for="address"
                  >Address <span class="req">*</span></label
                >
                <input
                  type="text"
                  id="address"
                  :value="form.address"
                  @input="form.address = $event.target.value.toUpperCase()"
                  required
                  placeholder="Street address, unit, etc."
                />
              </div>
              <div class="form-group">
                <label class="field-label" for="barangay"
                  >Barangay <span class="req">*</span></label
                >
                <select id="barangay" v-model="form.barangay" required>
                  <option value="">— Select Barangay —</option>
                  <option v-for="b in BARANGAYS" :key="b" :value="b">
                    {{ b }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- SECTION 3: Officers -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">3</span> Environmental Enforcers / Officers
            </div>
            <div class="officers-grid">
              <label
                v-for="officer in OFFICERS"
                :key="officer"
                :class="[
                  'officer-item',
                  form.officers.includes(officer) ? 'checked' : '',
                ]"
              >
                <input
                  type="checkbox"
                  :value="officer"
                  v-model="form.officers"
                />
                <span>{{ officer }}</span>
              </label>
            </div>
          </div>

          <!-- SECTION 4: Remarks -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">4</span> Remarks
            </div>
            <div class="form-group">
              <label class="field-label" for="remarks">Remarks / Notes</label>
              <textarea
                id="remarks"
                :value="form.remarks"
                @input="form.remarks = $event.target.value.toUpperCase()"
                placeholder="Additional notes, circumstances, etc."
              />
            </div>
          </div>

          <!-- SECTION 5: Signature -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">5</span> Signature of Apprehended Person
            </div>
            <SignatureCanvas
              @update="form.signatureData = $event"
              ref="sigCanvas"
            />
          </div>

          <!-- SECTION 6: Photos -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">6</span> Photo Evidence
            </div>
            <div class="photo-upload-row">
              <div
                v-for="n in [0, 1]"
                :key="n"
                :class="['photo-slot', photoPreviews[n] ? 'has-preview' : '']"
              >
                <div v-if="!photoPreviews[n]">
                  <div class="slot-icon">📷</div>
                  <div class="slot-label">
                    Photo {{ n + 1 }} — Tap to upload
                  </div>
                </div>
                <img
                  v-else
                  :src="photoPreviews[n]"
                  class="photo-preview"
                  :alt="`Photo ${n + 1} preview`"
                />
                <input
                  type="file"
                  accept="image/*"
                  @change="onPhotoChange($event, n)"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 7: Location -->
          <div class="form-section">
            <div class="section-title">
              <span class="sec-num">7</span> Location at Time of Submission
            </div>
            <div class="geo-status" :class="geoStatus">
              <span class="geo-icon">
                <template v-if="geoStatus === 'loading'">⏳</template>
                <template v-else-if="geoStatus === 'success'">📍</template>
                <template v-else-if="geoStatus === 'error'">⚠️</template>
                <template v-else>📍</template>
              </span>
              <div class="geo-text">
                <template v-if="geoStatus === 'loading'">
                  <strong>Getting your location…</strong>
                  <span>Please wait</span>
                </template>
                <template v-else-if="geoStatus === 'success'">
                  <strong>Location captured</strong>
                  <span
                    >{{ form.geoLat.toFixed(6) }},
                    {{ form.geoLng.toFixed(6) }} · Accuracy: ~{{
                      Math.round(form.geoAcc)
                    }}m</span
                  >
                </template>
                <template v-else-if="geoStatus === 'error'">
                  <strong>Location unavailable</strong>
                  <span
                    >{{ geoError }} — report will be submitted without
                    location.</span
                  >
                </template>
                <template v-else>
                  <strong>Location not yet captured</strong>
                </template>
              </div>
              <button
                v-if="geoStatus === 'error' || geoStatus === 'idle'"
                type="button"
                class="btn-retry-geo"
                @click="captureGeo"
              >
                Retry
              </button>
            </div>
            <div
              v-if="geoStatus === 'success'"
              ref="mapEl"
              class="geo-map"
            ></div>
          </div>

          <!-- Footer -->
          <div class="form-footer">
            <p>
              All fields marked <strong style="color: var(--red)">*</strong> are
              required.<br />Submitted reports are stored securely.
            </p>
            <button type="submit" class="btn-submit" :disabled="submitting">
              <span
                v-if="submitting"
                class="spinner-sm"
                style="
                  display: inline-block;
                  vertical-align: middle;
                  margin-right: 8px;
                  border-top-color: white;
                "
              ></span>
              {{ submitting ? "Submitting…" : "Submit Warning Report" }}
            </button>
          </div>
        </div>
      </form>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted, onUnmounted, nextTick } from "vue";
import SignatureCanvas from "../components/SignatureCanvas.vue";
import { BARANGAYS, OFFICERS, VIOLATIONS } from "../composables/constants.js";

const showToast = inject("showToast");
const sigCanvas = ref(null);
const mapEl = ref(null);
const submitting = ref(false);
const formVisible = ref(true);
const photoPreviews = ref([null, null]);
const photoFiles = ref([null, null]);

// Geo state
const geoStatus = ref("idle"); // idle | loading | success | error
const geoError = ref("");
let leafletMap = null;

function freshForm() {
  return {
    dateIssued: new Date().toISOString().split("T")[0],
    violations: {
      co3504: false,
      co911: false,
      co1424ab: false,
      co1424rest: false,
      co1011: false,
      other: false,
    },
    otherText: "",
    apprehendedFirstName: "",
    apprehendedLastName: "",
    address: "",
    barangay: "",
    officers: [],
    remarks: "",
    signatureData: "",
    geoLat: null,
    geoLng: null,
    geoAcc: null,
  };
}

const form = reactive(freshForm());

// ─── Geolocation ──────────────────────────────────────────────
async function captureGeo() {
  if (!navigator.geolocation) {
    geoStatus.value = "error";
    geoError.value = "Geolocation is not supported by this browser";
    return;
  }

  geoStatus.value = "loading";
  geoError.value = "";

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      form.geoLat = pos.coords.latitude;
      form.geoLng = pos.coords.longitude;
      form.geoAcc = pos.coords.accuracy;
      geoStatus.value = "success";

      // Mount Leaflet map after DOM updates
      await nextTick();
      initMap(form.geoLat, form.geoLng);
    },
    (err) => {
      geoStatus.value = "error";
      const messages = {
        1: "Location permission denied",
        2: "Location unavailable",
        3: "Location request timed out",
      };
      geoError.value = messages[err.code] || "Unknown error";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

function initMap(lat, lng) {
  if (!mapEl.value) return;

  // Load Leaflet CSS dynamically if not loaded yet
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }

  // Load Leaflet JS dynamically
  const loadLeaflet = () =>
    new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = resolve;
      document.head.appendChild(script);
    });

  loadLeaflet().then(() => {
    if (leafletMap) {
      leafletMap.remove();
      leafletMap = null;
    }

    leafletMap = window.L.map(mapEl.value).setView([lat, lng], 17);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(leafletMap);

    window.L.marker([lat, lng])
      .addTo(leafletMap)
      .bindPopup("Submission location")
      .openPopup();
  });
}

onMounted(() => {
  captureGeo();
});

onUnmounted(() => {
  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }
});

// ─── Photo preview ────────────────────────────────────────────
function onPhotoChange(e, index) {
  const file = e.target.files[0];
  if (!file) return;
  photoFiles.value[index] = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    photoPreviews.value[index] = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── Submit ───────────────────────────────────────────────────
async function submitForm() {
  const anyViol = Object.values(form.violations).some((v) => v);
  if (!anyViol) {
    showToast("Please select at least one violation.", true);
    return;
  }

  submitting.value = true;

  const fd = new FormData();
  fd.append("dateIssued", form.dateIssued);
  fd.append("apprehendedFirstName", form.apprehendedFirstName);
  fd.append("apprehendedLastName", form.apprehendedLastName);
  fd.append("address", form.address);
  fd.append("barangay", form.barangay);
  fd.append("remarks", form.remarks);
  fd.append("signatureData", form.signatureData);
  fd.append("otherText", form.otherText);
  if (form.geoLat) fd.append("geoLat", form.geoLat);
  if (form.geoLng) fd.append("geoLng", form.geoLng);
  if (form.geoAcc) fd.append("geoAcc", form.geoAcc);

  Object.entries(form.violations).forEach(([key, val]) => {
    if (val) fd.append(`viol_${key}`, "on");
  });
  form.officers.forEach((o) => fd.append("officers", o));
  photoFiles.value.forEach((f) => {
    if (f) fd.append("photos", f);
  });

  try {
    const res = await fetch("/api/reports", { method: "POST", body: fd });
    const data = await res.json();
    if (data.success) {
      showToast("Report submitted successfully!");
      formVisible.value = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (leafletMap) {
        leafletMap.remove();
        leafletMap = null;
      }
      setTimeout(() => {
        Object.assign(form, freshForm());
        photoPreviews.value = [null, null];
        photoFiles.value = [null, null];
        sigCanvas.value?.clear();
        formVisible.value = true;
        // Re-capture location for next submission
        captureGeo();
      }, 600);
    } else {
      showToast("Error: " + data.error, true);
    }
  } catch {
    showToast("Network error. Please try again.", true);
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.main-wrap {
  max-width: 900px;
  margin: 32px auto;
  padding: 0 16px 48px;
}
.form-card {
  background: white;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.07);
}
.form-section {
  padding: 28px 32px;
  border-bottom: 1px solid var(--border);
}
.form-section:last-child {
  border-bottom: none;
}
.section-title {
  font-family: "Source Serif 4", serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--green-dark);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--green-pale);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sec-num {
  background: var(--green-dark);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-family: "DM Sans", sans-serif;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.req {
  color: var(--red);
  margin-left: 2px;
}

/* Violations */
.violations-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.viol-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 6px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.viol-item:hover,
.viol-item.checked {
  border-color: var(--green-mid);
  background: var(--green-pale);
}
.viol-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--green-mid);
  flex-shrink: 0;
  margin-top: 2px;
  cursor: pointer;
}
.viol-label {
  font-size: 0.82rem;
  line-height: 1.4;
}
.viol-code {
  font-weight: 700;
  color: var(--green-dark);
  display: block;
}
.viol-desc {
  color: var(--text-muted);
}
.other-text-wrap {
  margin-top: 10px;
}

/* Officers */
.officers-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.officer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}
.officer-item:hover,
.officer-item.checked {
  border-color: var(--green-mid);
  background: var(--green-pale);
}
.officer-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--green-mid);
  cursor: pointer;
  flex-shrink: 0;
}
.officer-item span {
  font-size: 0.82rem;
  line-height: 1.3;
}

/* Photos */
.photo-upload-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.photo-slot {
  border: 2px dashed var(--border);
  border-radius: 6px;
  padding: 24px 16px;
  text-align: center;
  background: var(--surface);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-slot:hover {
  border-color: var(--green-mid);
  background: var(--green-pale);
}
.photo-slot input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.slot-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}
.slot-label {
  font-size: 0.82rem;
  color: var(--text-muted);
}
.photo-preview {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 4px;
}

/* Footer */
.form-footer {
  padding: 24px 32px;
  background: var(--green-pale);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.form-footer p {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.btn-submit {
  background: var(--green-dark);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 14px 36px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(26, 60, 42, 0.3);
  display: flex;
  align-items: center;
}
.btn-submit:hover:not(:disabled) {
  background: var(--green-mid);
  transform: translateY(-1px);
}
.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Geo location */
.geo-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  background: var(--surface);
  margin-bottom: 12px;
}
.geo-status.loading {
  border-color: #f0c040;
  background: #fffdf0;
}
.geo-status.success {
  border-color: var(--green-mid);
  background: var(--green-pale);
}
.geo-status.error {
  border-color: #f5c6c2;
  background: #fdecea;
}
.geo-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}
.geo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}
.geo-text strong {
  font-size: 0.85rem;
  color: var(--text);
}
.geo-text span {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.btn-retry-geo {
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  padding: 5px 12px;
  font-family: "DM Sans", sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-retry-geo:hover {
  border-color: var(--green-mid);
  color: var(--green-dark);
}
.geo-map {
  width: 100%;
  height: 220px;
  border-radius: 6px;
  border: 1px solid var(--border);
  overflow: hidden;
  z-index: 0;
}

/* Fade transition on submit */
.form-fade-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}
.form-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.form-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.form-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 600px) {
  .form-section {
    padding: 20px 16px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .violations-grid {
    grid-template-columns: 1fr;
  }
  .officers-grid {
    grid-template-columns: 1fr 1fr;
  }
  .photo-upload-row {
    grid-template-columns: 1fr;
  }
}
</style>
