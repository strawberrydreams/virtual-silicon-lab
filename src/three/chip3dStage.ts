import * as THREE from 'three'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'

export function addShowcaseLights(scene: THREE.Scene): void {
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
}

export function createShowcaseEnvironment(
  renderer: THREE.WebGLRenderer,
  model: Chip3DModel,
): { texture: THREE.Texture; dispose: () => void } {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.background = new THREE.Color(model.environment.topColor)
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(model.environment.bottomColor),
      side: THREE.BackSide,
    }),
  )
  envScene.add(ground)
  const renderTarget = pmrem.fromScene(envScene, 0.04)
  ground.geometry.dispose()
  ;(ground.material as THREE.Material).dispose()
  return {
    texture: renderTarget.texture,
    dispose: () => {
      renderTarget.dispose()
      pmrem.dispose()
    },
  }
}
