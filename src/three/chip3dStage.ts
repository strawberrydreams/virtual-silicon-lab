import * as THREE from 'three'
import type { ResolvedLight } from '../domain/scene3d/scene3d'
import type { Chip3DModel } from '../visual/chip3d/chip3dModel'

export function applyResolvedLights(scene: THREE.Scene, lights: readonly ResolvedLight[]): void {
  for (const light of lights) {
    if (light.kind === 'hemisphere') {
      scene.add(new THREE.HemisphereLight(light.skyColor, light.groundColor, light.intensity))
      continue
    }

    const directional = new THREE.DirectionalLight(light.color, light.intensity)
    directional.position.set(light.position[0], light.position[1], light.position[2])
    directional.castShadow = light.castShadow
    scene.add(directional)
  }
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
