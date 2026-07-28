<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  MANIFEST_PATH,
  entryBytes,
  scanTarBuffer,
  sniffBytes,
} from '@cryo/cryojs/browser'

const props = defineProps<{ url?: string }>()

const canvasHost = ref<HTMLDivElement | null>(null)
const status = ref('idle')

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let content: THREE.Object3D | null = null
let rafHandle = 0
let resizeObs: ResizeObserver | null = null

function setupRenderer(host: HTMLDivElement) {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d0f12)

  camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.01, 1000)
  camera.position.set(0, 1.5, 4)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(host.clientWidth, host.clientHeight)
  host.appendChild(renderer.domElement)

  // Neutral studio IBL so metallic PBR materials aren't black (no .hdr asset
  // needed) — same approach as the container's three-viewer.
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()

  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 5, 4)
  scene.add(key)
  scene.add(new THREE.HemisphereLight(0xbcc6d6, 0x2a2f38, 0.6))

  // Debug coordinate system: grid + axes (red=X, green=Y, blue=Z).
  scene.add(new THREE.GridHelper(20, 20, 0x2a3038, 0x1b2026))
  scene.add(new THREE.AxesHelper(1.5))

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)

  resizeObs = new ResizeObserver(() => resize(host))
  resizeObs.observe(host)

  const tick = () => {
    controls?.update()
    if (renderer && scene && camera) renderer.render(scene, camera)
    rafHandle = requestAnimationFrame(tick)
  }
  tick()
}

function resize(host: HTMLDivElement) {
  const w = host.clientWidth || 1
  const h = host.clientHeight || 1
  renderer?.setSize(w, h)
  if (camera) {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
}

/** Extract the first .glb/.gltf entry from a `.cryo` tar container's manifest. */
function firstModelFromContainer(bytes: Uint8Array): ArrayBuffer {
  const index = scanTarBuffer(bytes)

  const manifestEntry = index.get(MANIFEST_PATH)
  if (!manifestEntry) throw new Error('container is missing manifest.json')
  const manifest = JSON.parse(
    new TextDecoder().decode(entryBytes(bytes, { path: MANIFEST_PATH, ...manifestEntry })),
  )

  const modelPath = (manifest.contents as Array<{ path: string; type: string }>).find(
    (entry) => /\.(glb|gltf)$/i.test(entry.path),
  )?.path
  if (!modelPath) throw new Error('no .glb/.gltf asset found in container')

  const modelEntry = index.get(modelPath)
  if (!modelEntry) throw new Error(`manifest references missing entry: ${modelPath}`)
  const sliced = entryBytes(bytes, { path: modelPath, ...modelEntry })
  return sliced.buffer.slice(sliced.byteOffset, sliced.byteOffset + sliced.byteLength) as ArrayBuffer
}

async function load(url: string) {
  status.value = 'loading'
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`)
  const bytes = new Uint8Array(await res.arrayBuffer())

  // Accept either a `.cryo` container (tar) or a plain .glb/.gltf served directly.
  const modelBuffer =
    sniffBytes(bytes.subarray(0, 512)) === 'container'
      ? firstModelFromContainer(bytes)
      : (bytes.buffer as ArrayBuffer)

  const loader = new GLTFLoader()
  const gltf = await loader.parseAsync(modelBuffer, '')

  content = gltf.scene
  scene?.add(content)
  status.value = 'ready'
}

async function reload() {
  if (content) {
    scene?.remove(content)
    content = null
  }
  if (props.url) {
    try {
      await load(props.url)
    } catch (err) {
      status.value = `error: ${(err as Error).message}`
    }
  } else {
    status.value = 'idle'
  }
}

onMounted(() => {
  if (canvasHost.value) setupRenderer(canvasHost.value)
  reload()
})

watch(() => props.url, reload)

onBeforeUnmount(() => {
  cancelAnimationFrame(rafHandle)
  resizeObs?.disconnect()
  controls?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <div ref="canvasHost" :style="{ position: 'relative', width: '100%', height: '100%' }">
    <div
      v-if="status !== 'ready' && status !== 'idle'"
      :style="{ position: 'absolute', top: '0.5rem', left: '0.5rem', color: '#ccc', font: '12px monospace' }"
    >{{ status }}</div>
  </div>
</template>
