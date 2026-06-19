import * as THREE from 'three'
import type { Chip3DModel, Chip3DPiece, Footprint } from '../visual/chip3d/chip3dModel'

function shapeFromFootprint(footprint: Footprint): THREE.Shape {
  const shape = new THREE.Shape()
  const point = (x: number, y: number) => [x, -y] as const

  if (footprint.type === 'rect') {
    const corners = [
      point(footprint.x, footprint.y),
      point(footprint.x + footprint.width, footprint.y),
      point(footprint.x + footprint.width, footprint.y + footprint.height),
      point(footprint.x, footprint.y + footprint.height),
    ]
    shape.moveTo(...corners[0])
    for (const corner of corners.slice(1)) shape.lineTo(...corner)
  } else {
    footprint.points.forEach(([x, y], index) => {
      const mapped = point(x, y)
      if (index === 0) shape.moveTo(...mapped)
      else shape.lineTo(...mapped)
    })
  }

  shape.closePath()
  return shape
}

function meshForPiece(piece: Chip3DPiece): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shapeFromFootprint(piece.footprint), {
    depth: piece.depth,
    bevelEnabled: false,
  })
  // Shape y is negated above. After rotating the extrusion axis to +Y, the
  // original 2D y-down coordinate becomes +Z in the 3D floor plane.
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, piece.baseZ, 0)
  const material = new THREE.MeshStandardMaterial({
    color: piece.material.color,
    metalness: piece.material.metalness,
    roughness: piece.material.roughness,
    emissive: piece.material.emissive,
    emissiveIntensity: piece.material.emissiveIntensity,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.name = piece.id
  return mesh
}

export function buildChip3DScene(model: Chip3DModel): THREE.Group {
  const group = new THREE.Group()
  for (const piece of model.pieces) group.add(meshForPiece(piece))
  group.position.set(-model.center[0], 0, -model.center[2])
  return group
}

export function disposeChip3DScene(scene: THREE.Object3D): void {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.geometry.dispose()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  })
}
