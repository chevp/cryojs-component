<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  MANIFEST_PATH,
  MemorySource,
  entryBytes,
  scanTarSource,
} from '@cryo/cryojs/browser'

const props = defineProps<{ url?: string }>()

const canvasHost = ref<HTMLDivElement | null>(null)
const status = ref('idle')

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let rafHandle = 0

function setupRenderer(host: HTMLDivElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a1a)

  camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 1000)
  camera.position.set(2, 2, 4)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.5)
  sun.position.set(3, 5, 2)
  scene.add(sun)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(host.clientWidth, host.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  host.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  const tick = () => {
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
    rafHandle = requestAnimationFrame(tick)
  }
  tick()
}

async function loadCryoScene(url: string) {
  status.value = 'loading'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`)
  const buffer = await res.arrayBuffer()

  const source = new MemorySource(buffer)
  const index = await scanTarSource(source)

  const manifestBytes = await entryBytes(source, index, MANIFEST_PATH)
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes))

  const modelEntry = (manifest.contents as Array<{ path: string; type: string }>).find(
    (entry) => /\.(glb|gltf)$/i.test(entry.path),
  )
  if (!modelEntry) throw new Error('no .glb/.gltf asset found in container')

  const modelBytes = await entryBytes(source, index, modelEntry.path)
  const loader = new GLTFLoader()
  const gltf = await loader.parseAsync(modelBytes.buffer, '')

  scene?.add(gltf.scene)
  status.value = 'ready'
}

async function reload() {
  // Clear any previously loaded scene content, keep lights/camera.
  if (scene) {
    for (const child of [...scene.children]) {
      if (child.type === 'Group' || child.type === 'Object3D') scene.remove(child)
    }
  }
  if (props.url) {
    try {
      await loadCryoScene(props.url)
    } catch (err) {
      status.value = `error: ${(err as Error).message}`
    }
  }
}

onMounted(() => {
  if (canvasHost.value) setupRenderer(canvasHost.value)
  reload()
})

watch(() => props.url, reload)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafHandle)
  controls?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <div ref="canvasHost" class="cryo-scene">
    <div v-if="status !== 'ready'" class="cryo-scene__status">{{ status }}</div>
  </div>
</template>

<style scoped>
.cryo-scene {
  position: relative;
  width: 100%;
  height: 100vh;
}
.cryo-scene__status {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  color: #ccc;
  font: 12px monospace;
}
</style>
