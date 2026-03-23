<template>
  <div>
    <div class="sig-wrap">
      <canvas ref="canvasEl"></canvas>
    </div>
    <div class="sig-actions">
      <button type="button" class="btn-clear-sig" @click="clear">
        ✕ Clear Signature
      </button>
    </div>
    <p class="sig-hint">Use mouse or touch to draw signature above.</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const canvasEl = ref(null);
let ctx,
  drawing = false,
  hasSignature = false,
  sigSnapshot = null,
  resizeTimer = null;

const emit = defineEmits(["update"]);

function setup() {
  ctx = canvasEl.value.getContext("2d");
  resize();
}

function resize() {
  const rect = canvasEl.value.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width,
    h = 180;

  if (hasSignature) sigSnapshot = canvasEl.value.toDataURL();

  canvasEl.value.width = w * dpr;
  canvasEl.value.height = h * dpr;
  canvasEl.value.style.width = w + "px";
  canvasEl.value.style.height = h + "px";
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

function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
}

function getPos(e) {
  const rect = canvasEl.value.getBoundingClientRect();
  if (e.touches)
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onMouseDown(e) {
  drawing = true;
  ctx.beginPath();
  const p = getPos(e);
  ctx.moveTo(p.x, p.y);
}
function onMouseMove(e) {
  if (!drawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  hasSignature = true;
  sigSnapshot = null;
  emitData();
}
function onMouseUp() {
  drawing = false;
}
function onTouchStart(e) {
  e.preventDefault();
  drawing = true;
  ctx.beginPath();
  const p = getPos(e);
  ctx.moveTo(p.x, p.y);
}
function onTouchMove(e) {
  e.preventDefault();
  if (!drawing) return;
  const p = getPos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  hasSignature = true;
  sigSnapshot = null;
  emitData();
}
function onTouchEnd() {
  drawing = false;
}

function emitData() {
  emit("update", hasSignature ? canvasEl.value.toDataURL("image/png") : "");
}

function clear() {
  ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height);
  hasSignature = false;
  sigSnapshot = null;
  emit("update", "");
}

// Expose clear for parent use
defineExpose({ clear });

onMounted(() => {
  setup();
  const c = canvasEl.value;
  c.addEventListener("mousedown", onMouseDown);
  c.addEventListener("mousemove", onMouseMove);
  c.addEventListener("mouseup", onMouseUp);
  c.addEventListener("mouseleave", onMouseUp);
  c.addEventListener("touchstart", onTouchStart, { passive: false });
  c.addEventListener("touchmove", onTouchMove, { passive: false });
  c.addEventListener("touchend", onTouchEnd);
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped>
.sig-wrap {
  border: 2px dashed var(--border);
  border-radius: 6px;
  background: #fafafa;
  overflow: hidden;
}
canvas {
  display: block;
  width: 100%;
  height: 180px;
  cursor: crosshair;
  touch-action: none;
}
.sig-actions {
  margin-top: 10px;
}
.btn-clear-sig {
  background: none;
  border: 1.5px solid var(--border);
  border-radius: 4px;
  padding: 6px 14px;
  font-size: 0.8rem;
  font-family: "DM Sans", sans-serif;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
}
.btn-clear-sig:hover {
  border-color: var(--red);
  color: var(--red);
}
.sig-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 6px;
}
</style>
