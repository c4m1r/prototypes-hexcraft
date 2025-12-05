import * as THREE from 'three';

export const HEX_SIZE = 1;
export const HEX_HEIGHT = 1;

export interface HexCoords {
  q: number;
  r: number;
  s: number;
}

export function hexToWorld(q: number, r: number, y: number = 0): THREE.Vector3 {
  const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const z = HEX_SIZE * (3 / 2 * r);
  return new THREE.Vector3(x, y * HEX_HEIGHT, z);
}

export function worldToHex(x: number, z: number): HexCoords {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / HEX_SIZE;
  const r = (2 / 3 * z) / HEX_SIZE;
  return axialRound(q, r);
}

export function axialRound(q: number, r: number): HexCoords {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr, s: rs };
}

export function createHexGeometry(): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(HEX_SIZE, HEX_SIZE, HEX_HEIGHT, 6);
}

export function getChunkKey(q: number, r: number): string {
  return `${q},${r}`;
}

export function worldToChunk(x: number, z: number, chunkSize: number = 14): { q: number; r: number } {
  const hex = worldToHex(x, z);
  return {
    q: Math.floor(hex.q / chunkSize),
    r: Math.floor(hex.r / chunkSize)
  };
}
