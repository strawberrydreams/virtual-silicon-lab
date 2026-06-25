import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { resolveScene3D } from '../domain/scene3d/scene3d'
import { glowPulseAt, turntableAzimuthAt } from '../visual/chip3d/chip3dAnimation'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'
import { buildChip3DScene, disposeChip3DScene } from './chip3dScene'
import { applyResolvedLights, createShowcaseEnvironment } from './chip3dStage'

const UP = new THREE.Vector3(0, 1, 0)

export default function Chip3DViewer({ model }: { model: Chip3DModel }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    // A model change rebuilds the scene and cancels its animation in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaying(false)
  }, [model])

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

    const resolved = resolveScene3D({ extent: model.extent })
    applyResolvedLights(scene, resolved.lights)

    const cam = resolved.camera
    const camera = new THREE.PerspectiveCamera(cam.fov, 1, cam.near, cam.far)
    const initialPosition = new THREE.Vector3(cam.baseOffset[0], cam.baseOffset[1], cam.baseOffset[2])
    camera.position.copy(initialPosition)

    const controls = new OrbitControls(camera, renderer.domElement)
    const target = new THREE.Vector3(cam.target[0], cam.target[1], cam.target[2])
    controls.target.copy(target)
    controls.enableDamping = false
    controls.minDistance = cam.minDistance
    controls.maxDistance = cam.maxDistance
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

    let raf = 0
    let startTime = 0
    const baseOffset = new THREE.Vector3()
    const frameOffset = new THREE.Vector3()
    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000
      frameOffset.copy(baseOffset).applyAxisAngle(UP, turntableAzimuthAt(elapsed, resolved.animation.turntable))
      camera.position.copy(target).add(frameOffset)
      camera.lookAt(target)
      const pulse = glowPulseAt(elapsed, resolved.animation.glow)
      for (const pulser of pulsers) {
        pulser.material.emissiveIntensity = pulser.base * pulse
      }
      render()
      raf = requestAnimationFrame(animate)
    }
    const play = () => {
      if (raf) return
      baseOffset.copy(camera.position).sub(target)
      startTime = performance.now()
      controls.enabled = false
      animate()
    }
    const pause = () => {
      if (!raf) return
      cancelAnimationFrame(raf)
      raf = 0
      for (const pulser of pulsers) {
        pulser.material.emissiveIntensity = pulser.base
      }
      controls.enabled = true
      controls.update()
      render()
    }
    const onSetPlay = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) play()
      else pause()
    }

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
      if (raf) {
        baseOffset.copy(initialPosition).sub(target)
        startTime = performance.now()
      } else {
        camera.position.copy(initialPosition)
        controls.target.copy(target)
        controls.update()
        render()
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    controls.addEventListener('change', render)
    host.addEventListener('chip3d:reset-view', resetView)
    host.addEventListener('chip3d:set-play', onSetPlay)
    resize()

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.removeEventListener('change', render)
      host.removeEventListener('chip3d:reset-view', resetView)
      host.removeEventListener('chip3d:set-play', onSetPlay)
      controls.dispose()
      disposeChip3DScene(chip)
      environment.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [model])

  const resetView = () => {
    hostRef.current?.dispatchEvent(new Event('chip3d:reset-view'))
  }
  const togglePlay = () => {
    const next = !playing
    setPlaying(next)
    hostRef.current?.dispatchEvent(new CustomEvent('chip3d:set-play', { detail: next }))
  }

  return (
    <div className="chip-3d-viewer-shell">
      <div ref={hostRef} className="chip-3d-viewer" data-testid="chip-3d-viewer" />
      <button className="chip-3d-viewer__play" type="button" onClick={togglePlay}>
        {playing ? 'Pause' : 'Play turntable'}
      </button>
      <button className="chip-3d-viewer__reset" type="button" onClick={resetView}>
        Reset view
      </button>
    </div>
  )
}
