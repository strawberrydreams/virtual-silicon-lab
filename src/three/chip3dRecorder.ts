import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { resolveScene3D } from '../domain/scene3d/scene3d'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import {
  CAPTURE,
  captureFrameAt,
  captureFrameCount,
  type CaptureSpec,
} from '../visual/chip3d/chip3dCapture'
import { buildChip3DScene, disposeChip3DScene } from './chip3dScene'
import { createMp4Encoder } from './chip3dEncoder'
import { applyResolvedLights, createShowcaseEnvironment } from './chip3dStage'

const UP = new THREE.Vector3(0, 1, 0)

export async function recordTurntableMp4(
  model: Chip3DModel,
  opts: { spec?: CaptureSpec; onProgress?: (fraction: number) => void } = {},
): Promise<Blob> {
  const spec = opts.spec ?? CAPTURE
  const { width, height, fps } = spec

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = model.environment.exposure
  renderer.setClearColor(new THREE.Color(model.environment.bottomColor), 1)

  const scene = new THREE.Scene()
  const environment = createShowcaseEnvironment(renderer, model)
  scene.environment = environment.texture

  const chip = buildChip3DScene(model)
  scene.add(chip)
  const pulsers: { material: THREE.MeshStandardMaterial; base: number }[] = []
  chip.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      object.material.emissiveIntensity > 0
    ) {
      pulsers.push({ material: object.material, base: object.material.emissiveIntensity })
    }
  })
  const resolved = resolveScene3D(model.scene3d, { extent: model.extent })
  applyResolvedLights(scene, resolved.lights)

  const cam = resolved.camera
  const camera = new THREE.PerspectiveCamera(cam.fov, width / height, cam.near, cam.far)
  const target = new THREE.Vector3(cam.target[0], cam.target[1], cam.target[2])
  const baseOffset = new THREE.Vector3(cam.baseOffset[0], cam.baseOffset[1], cam.baseOffset[2])
  const frameOffset = new THREE.Vector3()

  const composer = new EffectComposer(renderer)
  composer.setSize(width, height)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(width, height),
      model.environment.bloom.strength,
      model.environment.bloom.radius,
      model.environment.bloom.threshold,
    ),
  )

  try {
    const encoder = await createMp4Encoder({ width, height, fps })
    const count = captureFrameCount(spec)
    for (let index = 0; index < count; index += 1) {
      const frame = captureFrameAt(index, spec)
      frameOffset.copy(baseOffset).applyAxisAngle(UP, frame.azimuth)
      camera.position.copy(target).add(frameOffset)
      camera.lookAt(target)
      for (const pulser of pulsers) {
        pulser.material.emissiveIntensity = pulser.base * frame.glow
      }
      composer.render()
      const videoFrame = new VideoFrame(renderer.domElement, {
        timestamp: Math.round((index * 1_000_000) / fps),
        duration: Math.round(1_000_000 / fps),
      })
      encoder.addFrame(videoFrame, index % fps === 0)
      videoFrame.close()
      opts.onProgress?.((index + 1) / count)
    }
    return await encoder.finish()
  } finally {
    composer.dispose()
    environment.dispose()
    disposeChip3DScene(chip)
    renderer.dispose()
    renderer.forceContextLoss()
  }
}
