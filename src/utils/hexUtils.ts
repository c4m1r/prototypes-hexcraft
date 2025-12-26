import * as THREE from 'three';

// HEX_SIZE - базовая единица размера для pointy-top ориентации
export const HEX_SIZE = 1;
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE; // Ширина гексагона = √3 * size
export const HEX_HEIGHT = HEX_WIDTH; // Высота = ширине для квадратного вида
// Радиус описанной окружности гексагона должен быть равен половине расстояния между центрами
// Расстояние между центрами = sqrt(3) * HEX_SIZE, поэтому радиус = sqrt(3) / 2 * HEX_SIZE
export const HEX_RADIUS = (Math.sqrt(3) / 2) * HEX_SIZE; // Радиус для правильного соприкосновения гранями

export interface HexCoords {
  q: number;
  r: number;
  s: number;
}

export function hexToWorld(q: number, r: number, y: number = 0): THREE.Vector3 {
  // Для pointy-top ориентации (остриями вверх):
  // x = size * √3 * (q + r/2)
  // z = size * 1.5 * r
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const z = HEX_SIZE * 1.5 * r;
  return new THREE.Vector3(x, y * HEX_HEIGHT, z);
}

export function worldToHex(x: number, z: number): HexCoords {
  // Обратная формула для pointy-top ориентации
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
  // Возвращаем к исходному варианту без поворота - как было изначально
  const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, HEX_HEIGHT, 6);
  return geometry;
}

export function createHexGeometryWithUV(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const radius = HEX_RADIUS; // Радиус для правильного соприкосновения гранями
  const height = HEX_HEIGHT;
  const segments = 6;
  // Все блоки без поворота - фиксированная ориентация 0 градусов

  // Верхняя грань (верхняя текстура)
  const topCenterIndex = vertices.length / 3;
  vertices.push(0, height / 2, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5); // Центр верхней текстуры

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, height / 2, z);
    normals.push(0, 1, 0);
    // UV для верхней грани (центр в 0.5, 0.5) - без поворота
    const uvAngle = (i / segments) * Math.PI * 2;
    const u = 0.5 + Math.cos(uvAngle) * 0.5;
    const v = 0.5 + Math.sin(uvAngle) * 0.5;
    uvs.push(u, v);
  }

  // Индексы для верхней грани
  for (let i = 0; i < segments; i++) {
    indices.push(topCenterIndex, topCenterIndex + i + 1, topCenterIndex + i + 2);
  }

  // Нижняя грань (нижняя текстура, используем ту же что и боковая)
  const bottomCenterIndex = vertices.length / 3;
  vertices.push(0, -height / 2, 0);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, -height / 2, z);
    normals.push(0, -1, 0);
    // UV без поворота для правильного наложения текстуры
    const uvAngle = (i / segments) * Math.PI * 2;
    const u = 0.5 + Math.cos(uvAngle) * 0.5;
    const v = 0.5 + Math.sin(uvAngle) * 0.5;
    uvs.push(u, v);
  }

  // Индексы для нижней грани
  for (let i = 0; i < segments; i++) {
    indices.push(bottomCenterIndex, bottomCenterIndex + i + 2, bottomCenterIndex + i + 1);
  }

  // Боковые грани (боковая текстура)
  const sideStartIndex = vertices.length / 3;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const nextAngle = ((i + 1) % (segments + 1)) / segments * Math.PI * 2;
    const nextX = Math.cos(nextAngle) * radius;
    const nextZ = Math.sin(nextAngle) * radius;

    // Верхние вершины
    vertices.push(x, height / 2, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
    uvs.push(i / segments, 1);

    // Нижние вершины
    vertices.push(x, -height / 2, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
    uvs.push(i / segments, 0);

    // Верхние вершины следующей грани
    vertices.push(nextX, height / 2, nextZ);
    normals.push(Math.cos(nextAngle), 0, Math.sin(nextAngle));
    uvs.push((i + 1) / segments, 1);

    // Нижние вершины следующей грани
    vertices.push(nextX, -height / 2, nextZ);
    normals.push(Math.cos(nextAngle), 0, Math.sin(nextAngle));
    uvs.push((i + 1) / segments, 0);

    const baseIdx = sideStartIndex + i * 4;
    indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
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
