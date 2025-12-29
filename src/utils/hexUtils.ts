import * as THREE from 'three';

// HEX_SIZE - базовая единица размера для pointy-top ориентации
// Рассчитываем HEX_SIZE так, чтобы расстояние между центрами соседних гексагонов было точно 2 * HEX_RADIUS + отступ
// Для pointy-top ориентации стандартная формула дает расстояние size * sqrt(3 + 2.25) = size * sqrt(5.25) ≈ size * 2.291
// Нужен отступ примерно 2-3 пикселя, что при HEX_RADIUS = 1 составляет примерно 0.015-0.02
// Поэтому уменьшаем HEX_RADIUS на 0.015 для создания отступа
export const HEX_RADIUS = 1 - 0.015; // Отступ примерно 1.5% от размера блока
// Теперь пересчитываем HEX_SIZE так, чтобы расстояние между центрами было 2 * HEX_RADIUS (блоки впритык, но не соприкасаются)
// Расстояние между центрами = HEX_SIZE * sqrt(5.25) = 2 * HEX_RADIUS
export const HEX_SIZE = (2 * HEX_RADIUS) / Math.sqrt(5.25); // ≈ 0.945
export const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE; // Ширина гексагона = √3 * size
export const HEX_HEIGHT = HEX_WIDTH; // Высота = ширине для квадратного вида

export interface HexCoords {
  q: number;
  r: number;
  s: number;
}

export function hexToWorld(q: number, r: number, y: number = 0): THREE.Vector3 {
  // Для pointy-top ориентации (остриями вверх):
  // Стандартная формула для гексагональной сетки
  // x = size * √3 * (q + r/2)
  // z = size * 1.5 * r
  // HEX_SIZE уже рассчитан так, чтобы расстояние между центрами было 2 * HEX_RADIUS
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

// Создаёт геометрию для grass блоков с правильными UV координатами для верхней и боковых граней
// Использует стандартное наложение текстур через UV координаты
export function createGrassHexGeometryWithUV(
  topTextureRow: number, 
  topTextureCol: number, 
  sideTextureRow: number, 
  sideTextureCol: number,
  atlasRows: number = 4,
  atlasCols: number = 10
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const radius = HEX_RADIUS;
  const height = HEX_HEIGHT;
  const segments = 6;

  // Вычисляем UV координаты для текстур в атласе
  const topUStart = topTextureCol / atlasCols;
  const topVStart = topTextureRow / atlasRows;
  const topUEnd = (topTextureCol + 1) / atlasCols;
  const topVEnd = (topTextureRow + 1) / atlasRows;

  const sideUStart = sideTextureCol / atlasCols;
  const sideVStart = sideTextureRow / atlasRows;
  const sideUEnd = (sideTextureCol + 1) / atlasCols;
  const sideVEnd = (sideTextureRow + 1) / atlasRows;

  // Верхняя грань (верхняя текстура из атласа)
  const topCenterIndex = vertices.length / 3;
  vertices.push(0, height / 2, 0);
  normals.push(0, 1, 0);
  uvs.push((topUStart + topUEnd) / 2, (topVStart + topVEnd) / 2); // Центр текстуры

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, height / 2, z);
    normals.push(0, 1, 0);
    // UV для верхней грани - маппинг на topTexture в атласе
    const uvAngle = (i / segments) * Math.PI * 2;
    const u = (topUStart + topUEnd) / 2 + Math.cos(uvAngle) * (topUEnd - topUStart) / 2;
    const v = (topVStart + topVEnd) / 2 + Math.sin(uvAngle) * (topVEnd - topVStart) / 2;
    uvs.push(u, v);
  }

  // Индексы для верхней грани
  for (let i = 0; i < segments; i++) {
    indices.push(topCenterIndex, topCenterIndex + i + 1, topCenterIndex + i + 2);
  }

  // Нижняя грань (используем sideTexture)
  const bottomCenterIndex = vertices.length / 3;
  vertices.push(0, -height / 2, 0);
  normals.push(0, -1, 0);
  uvs.push((sideUStart + sideUEnd) / 2, (sideVStart + sideVEnd) / 2);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, -height / 2, z);
    normals.push(0, -1, 0);
    // UV для нижней грани - маппинг на sideTexture в атласе
    const uvAngle = (i / segments) * Math.PI * 2;
    const u = (sideUStart + sideUEnd) / 2 + Math.cos(uvAngle) * (sideUEnd - sideUStart) / 2;
    const v = (sideVStart + sideVEnd) / 2 + Math.sin(uvAngle) * (sideVEnd - sideVStart) / 2;
    uvs.push(u, v);
  }

  // Индексы для нижней грани
  for (let i = 0; i < segments; i++) {
    indices.push(bottomCenterIndex, bottomCenterIndex + i + 2, bottomCenterIndex + i + 1);
  }

  // Боковые грани (боковая текстура из атласа)
  const sideStartIndex = vertices.length / 3;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const nextAngle = ((i + 1) % (segments + 1)) / segments * Math.PI * 2;
    const nextX = Math.cos(nextAngle) * radius;
    const nextZ = Math.sin(nextAngle) * radius;

    // Верхние вершины боковой грани
    vertices.push(x, height / 2, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
    // UV для боковой грани - маппинг на sideTexture в атласе
    const u = sideUStart + (i / segments) * (sideUEnd - sideUStart);
    const v = sideVEnd; // Верх боковой текстуры
    uvs.push(u, v);

    // Нижние вершины боковой грани
    vertices.push(x, -height / 2, z);
    normals.push(Math.cos(angle), 0, Math.sin(angle));
    uvs.push(u, sideVStart); // Низ боковой текстуры

    // Верхние вершины следующей грани
    vertices.push(nextX, height / 2, nextZ);
    normals.push(Math.cos(nextAngle), 0, Math.sin(nextAngle));
    const nextU = sideUStart + ((i + 1) / segments) * (sideUEnd - sideUStart);
    uvs.push(nextU, sideVEnd);

    // Нижние вершины следующей грани
    vertices.push(nextX, -height / 2, nextZ);
    normals.push(Math.cos(nextAngle), 0, Math.sin(nextAngle));
    uvs.push(nextU, sideVStart);

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
