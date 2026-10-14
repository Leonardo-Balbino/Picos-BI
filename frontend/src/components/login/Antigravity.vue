<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'

export type ParticleShape = 'capsule' | 'sphere' | 'box' | 'tetrahedron'

interface AntigravityProps {
  count?: number
  magnetRadius?: number
  ringRadius?: number
  waveSpeed?: number
  waveAmplitude?: number
  particleSize?: number
  lerpSpeed?: number
  color?: string
  autoAnimate?: boolean
  particleVariance?: number
  rotationSpeed?: number
  depthFactor?: number
  pulseSpeed?: number
  particleShape?: ParticleShape
  fieldStrength?: number
}

const props = withDefaults(defineProps<AntigravityProps>(), {
  count: 300,
  magnetRadius: 10,
  ringRadius: 10,
  waveSpeed: 0.4,
  waveAmplitude: 1,
  particleSize: 2,
  lerpSpeed: 0.1,
  color: '#27FF64',
  autoAnimate: false,
  particleVariance: 1,
  rotationSpeed: 0,
  depthFactor: 1,
  pulseSpeed: 3,
  particleShape: 'capsule',
  fieldStrength: 10,
})

interface ParticleData {
  mx: number
  my: number
  mz: number
  cx: number
  cy: number
  cz: number
  t: number
  factor: number
  speed: number
  xFactor: number
  yFactor: number
  zFactor: number
  randomRadiusOffset: number
}

interface Viewport {
  width: number
  height: number
}

const containerRef = ref<HTMLDivElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let mesh: THREE.InstancedMesh | null = null
let geometry: THREE.BufferGeometry | null = null
let material: THREE.MeshBasicMaterial | null = null
let clock: THREE.Clock | null = null
let animationFrameId: number | null = null
let particles: ParticleData[] = []
let viewport: Viewport = { width: 1, height: 1 }

const dummy = new THREE.Object3D()
const pointer = { x: 0, y: 0 }
const virtualMouse = { x: 0, y: 0 }
let lastPointerMoveAt = 0

function getViewportAtDepth(cam: THREE.PerspectiveCamera, depth: number): Viewport {
  const fov = (cam.fov * Math.PI) / 180
  const height = 2 * Math.tan(fov / 2) * depth
  const width = height * cam.aspect
  return { width, height }
}

function createGeometry(shape: ParticleShape): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere':
      return new THREE.SphereGeometry(0.2, 16, 16)
    case 'box':
      return new THREE.BoxGeometry(0.3, 0.3, 0.3)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(0.3)
    case 'capsule':
    default:
      return new THREE.CapsuleGeometry(0.1, 0.4, 4, 8)
  }
}

function createParticles(vp: Viewport): ParticleData[] {
  const list: ParticleData[] = []
  for (let i = 0; i < props.count; i++) {
    const mx = (Math.random() - 0.5) * vp.width
    const my = (Math.random() - 0.5) * vp.height
    const mz = (Math.random() - 0.5) * 20
    list.push({
      mx,
      my,
      mz,
      cx: mx,
      cy: my,
      cz: mz,
      t: Math.random() * 100,
      factor: 20 + Math.random() * 100,
      speed: 0.01 + Math.random() * 0.02,
      xFactor: -50 + Math.random() * 100,
      yFactor: -50 + Math.random() * 100,
      zFactor: -50 + Math.random() * 100,
      randomRadiusOffset: Math.random() * 2 - 1,
    })
  }
  return list
}

function onPointerMove(event: PointerEvent) {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
  lastPointerMoveAt = performance.now()
}

function onResize() {
  const container = containerRef.value
  if (!container || !renderer || !camera) return
  const width = container.clientWidth
  const height = container.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  viewport = getViewportAtDepth(camera, camera.position.z)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !mesh || !clock) return

  const elapsedTime = clock.getElapsedTime()
  const idleFor = performance.now() - lastPointerMoveAt
  const globalRotation = elapsedTime * props.rotationSpeed

  let rawDestX: number
  let rawDestY: number
  if (props.autoAnimate && idleFor > 2000) {
    rawDestX = Math.sin(elapsedTime * 0.5) * (viewport.width / 4)
    rawDestY = Math.cos(elapsedTime * 1.0) * (viewport.height / 4)
  } else {
    rawDestX = (pointer.x * viewport.width) / 2
    rawDestY = (pointer.y * viewport.height) / 2
  }

  const smoothFactor = 0.05
  virtualMouse.x += (rawDestX - virtualMouse.x) * smoothFactor
  virtualMouse.y += (rawDestY - virtualMouse.y) * smoothFactor

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    p.t += p.speed / 2

    // Parallax: particles closer to the camera track the target more tightly.
    const projectionFactor = 1 - p.cz / 50
    const projectedTargetX = virtualMouse.x * projectionFactor
    const projectedTargetY = virtualMouse.y * projectionFactor

    const dx = p.mx - projectedTargetX
    const dy = p.my - projectedTargetY
    const dist = Math.sqrt(dx * dx + dy * dy)

    let targetX: number
    let targetY: number
    let targetZ: number

    if (dist < props.magnetRadius) {
      const angle = Math.atan2(dy, dx) + globalRotation
      const wave = Math.sin(p.t * props.waveSpeed + angle) * 0.5 * props.waveAmplitude
      const offset = p.randomRadiusOffset * (5 / (props.fieldStrength + 0.1))
      const currentRadius = props.ringRadius + wave + offset

      targetX = projectedTargetX + Math.cos(angle) * currentRadius
      targetY = projectedTargetY + Math.sin(angle) * currentRadius
      targetZ = Math.sin(p.t) * props.waveAmplitude * props.depthFactor
    } else {
      targetX = p.mx
      targetY = p.my
      targetZ = p.mz * props.depthFactor
    }

    p.cx += (targetX - p.cx) * props.lerpSpeed
    p.cy += (targetY - p.cy) * props.lerpSpeed
    p.cz += (targetZ - p.cz) * props.lerpSpeed

    dummy.position.set(p.cx, p.cy, p.cz)
    dummy.lookAt(projectedTargetX, projectedTargetY, 0)
    dummy.rotateX(Math.PI / 2)

    const distFromRing = Math.abs(dist - props.ringRadius)
    const scaleFactor = clamp(1 - distFromRing / 10, 0, 1)
    const pulse = 0.8 + Math.sin(p.t * props.pulseSpeed) * 0.2 * props.particleVariance
    const scale = scaleFactor * pulse * props.particleSize
    dummy.scale.setScalar(scale)

    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  renderer.render(scene, camera)
}

function setupScene() {
  const container = containerRef.value
  if (!container) return

  const width = container.clientWidth
  const height = container.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000)
  camera.position.z = 50

  viewport = getViewportAtDepth(camera, camera.position.z)
  particles = createParticles(viewport)

  geometry = createGeometry(props.particleShape)
  material = new THREE.MeshBasicMaterial({ color: props.color })
  mesh = new THREE.InstancedMesh(geometry, material, props.count)
  scene.add(mesh)

  clock = new THREE.Clock()
  lastPointerMoveAt = performance.now()
  virtualMouse.x = 0
  virtualMouse.y = 0
  pointer.x = 0
  pointer.y = 0

  container.addEventListener('pointermove', onPointerMove)
  window.addEventListener('resize', onResize)

  animate()
}

function cleanup() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  const container = containerRef.value
  if (container) {
    container.removeEventListener('pointermove', onPointerMove)
  }
  window.removeEventListener('resize', onResize)

  geometry?.dispose()
  material?.dispose()

  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }

  particles = []
  mesh = null
  geometry = null
  material = null
  scene = null
  camera = null
  renderer = null
  clock = null
}

onMounted(() => {
  setupScene()
})

onUnmounted(() => {
  cleanup()
})

watch(
  () => props,
  () => {
    cleanup()
    setupScene()
  },
  { deep: true },
)
</script>

<template>
  <div ref="containerRef" class="h-full w-full" />
</template>
