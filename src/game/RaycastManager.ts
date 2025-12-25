import * as THREE from 'three';
import { World } from './World';
import { Block, BLOCK_TYPES } from '../types/game';
import { worldToHex, hexToWorld, HEX_RADIUS, HEX_HEIGHT, createHexGeometry } from '../utils/hexUtils';

export interface RaycastResult {
  block: Block;
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

export class RaycastManager {
  private raycaster: THREE.Raycaster;
  private scene: THREE.Scene;
  private world: World;
  private maxDistance: number = 10;
  private highlightMesh: THREE.LineSegments | null = null;

  constructor(scene: THREE.Scene, world: World) {
    this.raycaster = new THREE.Raycaster();
    this.scene = scene;
    this.world = world;
    this.createHighlightMesh();
  }

  private createHighlightMesh(): void {
    // Создаем геометрию точно как у блоков - без поворота, как было изначально
    const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, HEX_HEIGHT, 6);

    // Увеличиваем размер на небольшой offset чтобы outline был чуть больше блока
    const scale = 1.02; // 2% увеличение
    geometry.scale(scale, scale, scale);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    this.highlightMesh = new THREE.LineSegments(edgesGeometry, material);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);
  }

  raycast(camera: THREE.Camera): RaycastResult | null {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, false);

    for (const intersect of intersects) {
      let block: Block | null = null;

      if (intersect.object instanceof THREE.InstancedMesh) {
        if (intersect.instanceId !== undefined && intersect.object.userData.blocks) {
          block = intersect.object.userData.blocks[intersect.instanceId];
        }
      } else if (intersect.object.userData.block) {
        block = intersect.object.userData.block;
      }

      if (block) {
        if (this.highlightMesh) {
          // For InstancedMesh, we need to get position from matrix or calculate from block
          // intersect.point is accurate on the surface
          // But highlightMesh needs to be at block center?
          // The original code used intersect.object.position which was the block center for individual meshes.
          // For InstancedMesh, object.position is 0,0,0 (usually).
          // We should use the block's calculated world position.

          const worldPos = hexToWorld(block.position.q, block.position.r, block.position.y);
          this.highlightMesh.position.copy(worldPos);
          this.highlightMesh.visible = true;
        }

        return {
          block,
          position: intersect.point,
          normal: intersect.face ? intersect.face.normal : new THREE.Vector3(0, 1, 0)
        };
      }
    }

    if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }

    return null;
  }

  placeBlock(camera: THREE.Camera, blockType: string): boolean {
    const result = this.raycast(camera);
    if (!result) return false;

    const normal = result.normal.clone();
    normal.applyQuaternion(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, 0)
      )
    );

    let placePos = result.position.clone().add(normal.multiplyScalar(0.5));

    if (Math.abs(normal.y) > 0.5) {
      placePos = result.position.clone().add(normal.multiplyScalar(1));
    }

    const hexCoords = worldToHex(placePos.x, placePos.z);
    const y = Math.round(placePos.y);

    const existingBlock = this.world.getBlockAt(hexCoords.q, hexCoords.r, y);
    if (!existingBlock) {
      const newBlock: Block = {
        type: blockType,
        position: { q: hexCoords.q, r: hexCoords.r, s: hexCoords.s, y }
      };
      this.world.addBlock(newBlock);
      return true;
    }
    return false;
  }

  removeBlock(camera: THREE.Camera): Block | null {
    const result = this.raycast(camera);
    if (!result) return null;

    return this.world.removeBlock(
      result.block.position.q,
      result.block.position.r,
      result.block.position.y
    );
  }

  getTargetedBlock(camera: THREE.Camera): { block: Block; name: string } | null {
    const result = this.raycast(camera);
    if (!result) return null;

    const blockType = BLOCK_TYPES.find(bt => bt.id === result.block.type);
    return {
      block: result.block,
      name: blockType?.name || 'Unknown'
    };
  }
}
