import * as THREE from 'three';

/*
  ============================================================
  HEX GRID — POINTY-TOP ORIENTATION (остриями вверх)
  ============================================================

  ВАЖНО:
  - В hex grid size = радиус гекса (расстояние от центра до ВЕРШИНЫ)
  - Этот же size ОБЯЗАН использоваться:
      • в формулах сетки (hexToWorld / worldToHex)
      • в геометрии (CylinderGeometry radius)
  - Нельзя "подгонять" size формулами — это вызывает дрейф и наложения
*/

/*
  ------------------------------------------------------------
  БАЗОВЫЕ РАЗМЕРЫ
  ------------------------------------------------------------
*/

// Единственный источник истины для размера гекса.
// Радиус от центра до вершины.
export const HEX_SIZE = 1.0;

// Радиус геометрии цилиндра.
// Для правильного соприкосновения гексов он ДОЛЖЕН быть равен HEX_SIZE.
export const HEX_RADIUS = HEX_SIZE;

// Высота блока по оси Y (толщина тайла).
// Не участвует в grid-математике.
export const HEX_HEIGHT = 1.0;

/*
  ------------------------------------------------------------
  КООРДИНАТЫ
  ------------------------------------------------------------
*/

// Cube / Axial координаты гекса.
// Всегда должно выполняться: q + r + s = 0
export interface HexCoords {
  q: number;
  r: number;
  s: number;
}

/*
  ------------------------------------------------------------
  HEX → WORLD
  ------------------------------------------------------------

  Формулы для pointy-top ориентации (канон):

    x = size * √3 * (q + r/2)
    z = size * 3/2 * r

  Эти формулы ГАРАНТИРУЮТ:
  - одинаковое расстояние между центрами
  - отсутствие накопления ошибки
  - корректное замыкание колец
*/
export function hexToWorld(
  q: number,
  r: number,
  y: number = 0
): THREE.Vector3 {

  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const z = HEX_SIZE * 1.5 * r;

  // y умножаем на высоту блока
  return new THREE.Vector3(x, y * HEX_HEIGHT, z);
}

/*
  ------------------------------------------------------------
  WORLD → HEX
  ------------------------------------------------------------

  Обратное преобразование world → axial
  Используется для:
  - определения гекса под курсором
  - кликов
  - raycast
*/
export function worldToHex(x: number, z: number): HexCoords {

  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * z) / HEX_SIZE;
  const r = (2 / 3 * z) / HEX_SIZE;

  return axialRound(q, r);
}

/*
  ------------------------------------------------------------
  ОКРУГЛЕНИЕ AXIAL → CUBE
  ------------------------------------------------------------

  После обратного преобразования координаты дробные.
  Мы переводим их в cube-пространство и аккуратно округляем,
  сохраняя инвариант q + r + s = 0.
*/
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

/*
  ------------------------------------------------------------
  ГЕОМЕТРИЯ ГЕКСА (Cylinder)
  ------------------------------------------------------------

  CylinderGeometry с 6 сегментами:
  - по умолчанию ориентирован "pointy-top"
  - не требует поворота
*/
export function createHexGeometry(): THREE.CylinderGeometry {

  return new THREE.CylinderGeometry(
    HEX_RADIUS,   // верхний радиус
    HEX_RADIUS,   // нижний радиус
    HEX_HEIGHT,   // высота
    6,            // сегменты (шестигранник)
    1,            // heightSegments
    false         // не полый
  );
}

/*
  ------------------------------------------------------------
  КАСТОМНАЯ ГЕОМЕТРИЯ С UV
  ------------------------------------------------------------

  ВАЖНО:
  - Геометрия использует ТОТ ЖЕ радиус, что и grid
  - Никаких "компенсаций" в размерах здесь быть не должно
*/
export function createHexGeometryWithUV(): THREE.BufferGeometry {

  const geometry = new THREE.BufferGeometry();

  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const radius = HEX_RADIUS;
  const height = HEX_HEIGHT;
  const segments = 6;

  /*
    -------------------------
    ВЕРХНЯЯ ГРАНЬ
    -------------------------
  */

  const topCenterIndex = vertices.length / 3;
  vertices.push(0, height / 2, 0);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    vertices.push(x, height / 2, z);
    normals.push(0, 1, 0);

    uvs.push(
      0.5 + Math.cos(angle) * 0.5,
      0.5 + Math.sin(angle) * 0.5
    );
  }

  for (let i = 0; i < segments; i++) {
    indices.push(
      topCenterIndex,
      topCenterIndex + i + 1,
      topCenterIndex + i + 2
    );
  }

  /*
    -------------------------
    НИЖНЯЯ ГРАНЬ
    -------------------------
  */

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

    uvs.push(
      0.5 + Math.cos(angle) * 0.5,
      0.5 + Math.sin(angle) * 0.5
    );
  }

  for (let i = 0; i < segments; i++) {
    indices.push(
      bottomCenterIndex,
      bottomCenterIndex + i + 2,
      bottomCenterIndex + i + 1
    );
  }

  /*
    -------------------------
    БОКОВЫЕ ГРАНИ
    -------------------------
  */

  const sideStartIndex = vertices.length / 3;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    vertices.push(x,  height / 2, z);
    vertices.push(x, -height / 2, z);

    const nx = Math.cos(angle);
    const nz = Math.sin(angle);

    normals.push(nx, 0, nz);
    normals.push(nx, 0, nz);

    uvs.push(i / segments, 1);
    uvs.push(i / segments, 0);
  }

  for (let i = 0; i < segments; i++) {
    const a = sideStartIndex + i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;

    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  /*
    -------------------------
    ФИНАЛИЗАЦИЯ
    -------------------------
  */

  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  geometry.computeBoundingSphere();

  return geometry;
}

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

/*
  Деление для координатной сетки чанков.

  Отличие от Math.floor:
  - работает СИММЕТРИЧНО относительно нуля
  - гарантирует, что (0,0) лежит ВНУТРИ чанка (0,0)
  - корректно обрабатывает отрицательные координаты

  Используется ТОЛЬКО для grid / chunk логики.
*/
function divFloor(a: number, b: number): number {

  // Для положительных координат —
  // обычное деление с округлением вниз
  if (a >= 0) {
    return Math.floor(a / b);
  }

  // Для отрицательных координат:
  // компенсируем поведение Math.floor,
  // чтобы чанки были симметричны
  return Math.floor((a - b + 1) / b);
}

/*
  ------------------------------------------------------------
  WORLD → CHUNK
  ------------------------------------------------------------

  1. Определяем hex под мировой координатой
  2. Делим axial-координаты на размер чанка
  3. Используем divFloor для симметрии

  chunkSize — радиус чанка в гексах (не в метрах!)
*/
export function worldToChunk(
  x: number,
  z: number,
  chunkSize: number = 14
): { q: number; r: number } {

  // Преобразуем world → hex
  const hex = worldToHex(x, z);

  // Преобразуем hex → chunk
  return {
    q: divFloor(hex.q, chunkSize),
    r: divFloor(hex.r, chunkSize)
  };
}
