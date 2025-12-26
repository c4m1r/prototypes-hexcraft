import * as THREE from 'three';

/**
 * Simple object pool for Three.js objects to reduce garbage collection pressure
 */
export class ObjectPool<T extends THREE.Object3D> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(
    createFn: () => T,
    resetFn?: (obj: T) => void,
    initialSize = 10,
    maxSize = 100
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-allocate initial objects
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  /**
   * Get an object from the pool, creating a new one if none available
   */
  get(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.createFn();
    }

    this.active.add(obj);
    return obj;
  }

  /**
   * Return an object to the pool for reuse
   */
  release(obj: T): void {
    if (this.active.has(obj)) {
      this.active.delete(obj);

      // Reset object state if reset function provided
      if (this.resetFn) {
        this.resetFn(obj);
      }

      // Only keep up to maxSize objects
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      } else {
        // Dispose of excess objects
        this.disposeObject(obj);
      }
    }
  }

  /**
   * Release all active objects back to the pool
   */
  releaseAll(): void {
    for (const obj of this.active) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      } else {
        this.disposeObject(obj);
      }
    }
    this.active.clear();
  }

  /**
   * Dispose of an object properly
   */
  private disposeObject(obj: T): void {
    // Clean up geometries and materials
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Remove from parent if attached
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.available.length,
      active: this.active.size,
      total: this.available.length + this.active.size
    };
  }

  /**
   * Clean up all objects in the pool
   */
  dispose(): void {
    // Dispose of all available objects
    for (const obj of this.available) {
      this.disposeObject(obj);
    }

    // Dispose of all active objects
    for (const obj of this.active) {
      this.disposeObject(obj);
    }

    this.available = [];
    this.active.clear();
  }
}

/**
 * Specialized pool for InstancedMesh objects used in chunk rendering
 */
export class InstancedMeshPool extends ObjectPool<THREE.InstancedMesh> {
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
    maxInstances = 1000
  ) {
    super(
      () => new THREE.InstancedMesh(geometry, material, count),
      (mesh) => {
        // Reset instance matrices
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      },
      5, // initial size
      maxInstances
    );
  }
}

/**
 * Pool for matrix objects to reduce allocations
 */
export class MatrixPool {
  private available: THREE.Matrix4[] = [];
  private active: Set<THREE.Matrix4> = new Set();

  get(): THREE.Matrix4 {
    let matrix: THREE.Matrix4;

    if (this.available.length > 0) {
      matrix = this.available.pop()!;
      matrix.identity(); // Reset to identity
    } else {
      matrix = new THREE.Matrix4();
    }

    this.active.add(matrix);
    return matrix;
  }

  release(matrix: THREE.Matrix4): void {
    if (this.active.has(matrix)) {
      this.active.delete(matrix);
      this.available.push(matrix);
    }
  }

  getStats() {
    return {
      available: this.available.length,
      active: this.active.size,
      total: this.available.length + this.active.size
    };
  }
}

// Global pools for common use
export const globalMatrixPool = new MatrixPool();
