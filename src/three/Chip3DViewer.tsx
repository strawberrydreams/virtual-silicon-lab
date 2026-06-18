import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import { buildChip3DScene, disposeChip3DScene } from './chip3dScene'

export default function Chip3DViewer({ model }: { model: Chip3DModel }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = model.environment.exposure
    host.append(renderer.domElement)

    const scene = new THREE.Scene()

    // Procedural studio environment: a vertical gradient → PMREM → image-based
    // reflections on metal surfaces. Tinted by the theme backdrop so reflections
    // read on-theme. No external HDRI asset (keeps the chunk asset-free).
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envScene = new THREE.Scene()
    const top = new THREE.Color(model.environment.topColor)
    const bottom = new THREE.Color(model.environment.bottomColor)
    envScene.background = top
    const envGround = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshBasicMaterial({ color: bottom, side: THREE.BackSide }),
    )
    envScene.add(envGround)
    const envRT = pmrem.fromScene(envScene, 0.04)
    scene.environment = envRT.texture
    envGround.geometry.dispose()
    ;(envGround.material as THREE.Material).dispose()

    const chip = buildChip3DScene(model)
    scene.add(chip)

    // Three-point rig + low ambient. Key warm/strong (shadow), fill cool/soft, rim/back.
    scene.add(new THREE.HemisphereLight(0xc8dcff, 0x08080c, 1.2))
    const key = new THREE.DirectionalLight(0xfff1e0, 3.2)
    key.position.set(1, 2, 1)
    key.castShadow = true
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xbcd0ff, 1.1)
    fill.position.set(-1.5, 1, 1.2)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffffff, 1.6)
    rim.position.set(-0.5, 1.2, -2)
    scene.add(rim)

    const distance = Math.max(model.extent[0], model.extent[2]) * 0.95
    const camera = new THREE.PerspectiveCamera(42, 1, 1, distance * 10)
    const initialPosition = new THREE.Vector3(distance, distance * 0.9, distance)
    camera.position.copy(initialPosition)

    const controls = new OrbitControls(camera, renderer.domElement)
    const target = new THREE.Vector3(0, model.extent[1] / 2, 0)
    controls.target.copy(target)
    controls.enableDamping = false
    controls.minDistance = distance * 0.45
    controls.maxDistance = distance * 3
    controls.update()

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      model.environment.bloom.strength,
      model.environment.bloom.radius,
      model.environment.bloom.threshold,
    )
    composer.addPass(bloom)

    const render = () => composer.render()
    const resize = () => {
      const width = host.clientWidth || 640
      const height = host.clientHeight || 420
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      composer.setSize(width, height)
      bloom.setSize(width, height)
      render()
    }
    const resetView = () => {
      camera.position.copy(initialPosition)
      controls.target.copy(target)
      controls.update()
      render()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    controls.addEventListener('change', render)
    host.addEventListener('chip3d:reset-view', resetView)
    resize()

    return () => {
      observer.disconnect()
      controls.removeEventListener('change', render)
      host.removeEventListener('chip3d:reset-view', resetView)
      controls.dispose()
      disposeChip3DScene(chip)
      envRT.dispose()
      pmrem.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [model])

  const resetView = () => {
    hostRef.current?.dispatchEvent(new Event('chip3d:reset-view'))
  }

  return (
    <div className="chip-3d-viewer-shell">
      <div ref={hostRef} className="chip-3d-viewer" data-testid="chip-3d-viewer" />
      <button className="chip-3d-viewer__reset" type="button" onClick={resetView}>
        Reset view
      </button>
    </div>
  )
}
