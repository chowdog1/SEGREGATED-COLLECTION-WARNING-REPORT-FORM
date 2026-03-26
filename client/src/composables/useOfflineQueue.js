// Offline queue using IndexedDB
// Stores pending form submissions when offline, syncs when back online

const DB_NAME = "cenro_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_reports";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function queueReport(formData) {
  // Convert FormData to a plain object we can store in IndexedDB
  const obj = {
    timestamp: Date.now(),
    fields: {},
    photos: [],
    signatureData: "",
  };

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      // Convert file to base64 for storage
      const base64 = await fileToBase64(value);
      obj.photos.push({ name: value.name, type: value.type, data: base64 });
    } else if (key === "signatureData") {
      obj.signatureData = value;
    } else if (key === "officers") {
      if (!obj.fields.officers) obj.fields.officers = [];
      obj.fields.officers.push(value);
    } else {
      obj.fields[key] = value;
    }
  }

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.add(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingReports() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeReport(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncPendingReports(onProgress) {
  const pending = await getPendingReports();
  if (!pending.length) return 0;

  let synced = 0;
  for (const report of pending) {
    try {
      const fd = buildFormData(report);
      const res = await fetch("/api/reports", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        await removeReport(report.id);
        synced++;
        if (onProgress) onProgress(synced, pending.length);
      }
    } catch {
      // Still offline or error — stop trying
      break;
    }
  }
  return synced;
}

function buildFormData(report) {
  const fd = new FormData();
  // Append all fields
  Object.entries(report.fields).forEach(([key, val]) => {
    if (Array.isArray(val)) val.forEach((v) => fd.append(key, v));
    else fd.append(key, val);
  });
  // Append signature
  if (report.signatureData) fd.append("signatureData", report.signatureData);
  // Append photos
  report.photos.forEach((photo) => {
    const blob = base64ToBlob(photo.data, photo.type);
    fd.append("photos", blob, photo.name);
  });
  return fd;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(dataUrl, type) {
  const arr = dataUrl.split(",");
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type });
}

export async function getPendingCount() {
  const pending = await getPendingReports();
  return pending.length;
}
