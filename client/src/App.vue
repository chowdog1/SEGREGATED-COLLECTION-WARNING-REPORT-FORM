<template>
  <div>
    <!-- Offline / Online banner -->
    <Transition name="banner">
      <div v-if="banner.visible" :class="['conn-banner', banner.type]">
        <span class="banner-icon">{{
          banner.type === "offline" ? "⚠️" : "✓"
        }}</span>
        <span>{{ banner.message }}</span>
      </div>
    </Transition>

    <header class="site-header">
      <div class="header-inner">
        <div class="header-logo">
          <img
            src="https://8upload.com/image/68be3f83c9e7e/freepik_br_bb4e2098-1dee-4111-8179-ddc41996d8da.png"
            alt="CENRO Logo"
          />
        </div>
        <div class="header-text">
          <h1>City Environment &amp; Natural Resources Office</h1>
          <p>Environmental Enforcement Division · Warning Report System</p>
        </div>
      </div>
      <nav class="nav-bar">
        <RouterLink to="/">Submit Report</RouterLink>
        <RouterLink to="/reports">View Reports</RouterLink>
        <RouterLink to="/dashboard">Dashboard</RouterLink>
        <span
          v-if="pendingCount > 0"
          class="pending-badge"
          title="Reports waiting to sync"
        >
          {{ pendingCount }} pending
        </span>
      </nav>
    </header>

    <RouterView />

    <!-- Global toast -->
    <div
      :class="[
        'toast',
        toast.visible ? 'show' : '',
        toast.error ? 'error' : '',
      ]"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, provide, onMounted, onUnmounted } from "vue";
import {
  syncPendingReports,
  getPendingCount,
} from "./composables/useOfflineQueue.js";

const toast = reactive({ visible: false, message: "", error: false });
let toastTimer = null;

function showToast(message, error = false) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.message = message;
  toast.error = error;
  toast.visible = true;
  toastTimer = setTimeout(() => {
    toast.visible = false;
  }, 4000);
}

provide("showToast", showToast);
provide("refreshPendingCount", refreshPendingCount);

// ─── Offline / Online detection ───────────────────────────────
const banner = reactive({ visible: false, message: "", type: "offline" });
const pendingCount = ref(0);
let bannerTimer = null;

async function refreshPendingCount() {
  pendingCount.value = await getPendingCount();
}

function showBanner(message, type, autoDismiss = 0) {
  if (bannerTimer) clearTimeout(bannerTimer);
  banner.message = message;
  banner.type = type;
  banner.visible = true;
  if (autoDismiss) {
    bannerTimer = setTimeout(() => {
      banner.visible = false;
    }, autoDismiss);
  }
}

async function handleOnline() {
  const count = await getPendingCount();
  if (count > 0) {
    showBanner(
      `Connection restored. Syncing ${count} pending report${count !== 1 ? "s" : ""}…`,
      "online",
    );
    const synced = await syncPendingReports();
    await refreshPendingCount();
    if (synced > 0) {
      showBanner(
        `${synced} report${synced !== 1 ? "s" : ""} synced successfully.`,
        "online",
        5000,
      );
      showToast(
        `${synced} pending report${synced !== 1 ? "s" : ""} submitted.`,
      );
    } else {
      showBanner("Connection restored.", "online", 4000);
    }
  } else {
    showBanner("Connection restored.", "online", 4000);
  }
}

function handleOffline() {
  showBanner(
    "You are offline. Reports will be saved and submitted when connection is restored.",
    "offline",
  );
}

onMounted(async () => {
  await refreshPendingCount();

  // Check if already offline on load
  if (!navigator.onLine) handleOffline();

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
});

onUnmounted(() => {
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
});
</script>

<style>
/* ─── Connection banner ──────────────────────────────────────── */
.conn-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: "DM Sans", sans-serif;
  position: sticky;
  top: 0;
  z-index: 9990;
}
.conn-banner.offline {
  background: #f0a500;
  color: #3a2000;
}
.conn-banner.online {
  background: #2e6b47;
  color: white;
}
.banner-icon {
  font-size: 1rem;
}

/* Banner transition */
.banner-enter-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
}
.banner-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.25s ease;
}
.banner-enter-from {
  max-height: 0;
  opacity: 0;
}
.banner-leave-to {
  max-height: 0;
  opacity: 0;
}
.banner-enter-to,
.banner-leave-from {
  max-height: 60px;
}

/* Pending badge in nav */
.pending-badge {
  background: #f0a500;
  color: #3a2000;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  margin-left: 8px;
  align-self: center;
  animation: pulse-badge 2s infinite;
}
@keyframes pulse-badge {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
