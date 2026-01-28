<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'

// Globe configuration
const globeConfig = reactive({
  pointSize: 1,
  globeColor: "#0b43bd",
  showAtmosphere: true,
  atmosphereColor: "#FFFFFF",
  atmosphereAltitude: 0.1,
  emissive: "#062056",
  emissiveIntensity: 0.1,
  shininess: 0.9,
  polygonColor: "rgba(255,255,255,1)",
  ambientLight: "#38bdf8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1000,
  arcLength: 1,
  rings: 1,
  maxRings: 10,
  initialPosition: { lat: 22.3193, lng: 114.1694 },
  autoRotate: true,
  autoRotateSpeed: 2.5,
})

const colors = [
  "#eae547",
  "#9347ea",
  "#d4ea47",
  "#ddea47",
  "#47ea70",
  "#eab447",
  "#eaa647",
  "#c747ea",
  "#52ea47",
  "#4754ea",
]

const sampleArcs = ref([
  {
    order: 1,
    startLat: -19.885592,
    startLng: -43.951191,
    endLat: -22.9068,
    endLng: -43.1729,
    arcAlt: 0.1,
    color: colors[Math.floor(Math.random() * (colors.length - 1))],
  },
  {
    order: 1,
    startLat: 28.6139,
    startLng: 77.209,
    endLat: 3.139,
    endLng: 101.6869,
    arcAlt: 0.2,
    color: colors[Math.floor(Math.random() * (colors.length - 1))],
  },
  {
    order: 2,
    startLat: 1.3521,
    startLng: 103.8198,
    endLat: 35.6762,
    endLng: 139.6503,
    arcAlt: 0.2,
    color: colors[Math.floor(Math.random() * (colors.length - 1))],
  },
])

const arcCount = computed(() => sampleArcs.value.length)
const isAutoRotate = computed(() => globeConfig.autoRotate)

onMounted(() => {
  console.log('Vue Globe Component Mounted!')
  console.log('Arc Count:', arcCount.value)
})
</script>

<template>
  <div class="globe-wrapper">
    <div class="globe-header">
      <h2>🌍 Interactive Globe</h2>
      <p class="subtitle">Vue 3 with Composition API</p>
    </div>
    
    <div class="globe-container">
      <div class="globe-placeholder">
        <div class="rotating-globe">🌐</div>
        <p>Globe Visualization</p>
      </div>
    </div>
    
    <div class="globe-stats">
      <div class="stat-card">
        <span class="stat-label">Arcs</span>
        <span class="stat-value">{{ arcCount }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Auto Rotate</span>
        <span class="stat-value">{{ isAutoRotate ? '✓' : '✗' }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Speed</span>
        <span class="stat-value">{{ globeConfig.autoRotateSpeed }}x</span>
      </div>
    </div>
    
    <div class="arc-list">
      <h3>Connection Arcs</h3>
      <div v-for="(arc, index) in sampleArcs" :key="index" class="arc-item">
        <div class="arc-color" :style="{ backgroundColor: arc.color }"></div>
        <span>Order {{ arc.order }} - Alt: {{ arc.arcAlt }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.globe-wrapper {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
  border-radius: 16px;
  color: #fafafa;
  font-family: system-ui, -apple-system, sans-serif;
}

.globe-header {
  text-align: center;
  margin-bottom: 2rem;
}

.globe-header h2 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #38bdf8 0%, #0b43bd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

.globe-container {
  background: rgba(11, 67, 189, 0.1);
  border: 2px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  padding: 3rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.globe-placeholder {
  text-align: center;
}

.rotating-globe {
  font-size: 4rem;
  animation: rotate 4s linear infinite;
  display: inline-block;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.globe-placeholder p {
  margin-top: 1rem;
  color: #64748b;
  font-size: 0.875rem;
}

.globe-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #38bdf8;
}

.arc-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
}

.arc-list h3 {
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: #e2e8f0;
}

.arc-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.875rem;
  color: #cbd5e1;
}

.arc-item:last-child {
  border-bottom: none;
}

.arc-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
