<template>
  <div>
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
import { reactive, provide } from "vue";

// Global toast state — provided to all child components
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
</script>
