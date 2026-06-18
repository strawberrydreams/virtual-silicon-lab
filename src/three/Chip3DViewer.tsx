import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
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
    host.append(renderer.domElement)

    const scene = new THREE.Scene()
    const chip = buildChip3DScene(model)
    scene.add(chip)
    scene.add(new THREE.HemisphereLight(0xc8dcff, 0x08080c, 3.4))
    const key = new THREE.DirectionalLight(0xffffff, 4.2)
    key.position.set(1, 2, 1)
    key.castShadow = true
    scene.add(key)

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

    const render = () => renderer.render(scene, camera)
    const resize = () => {
      const width = host.clientWidth || 640
      const height = host.clientHeight || 420
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
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
