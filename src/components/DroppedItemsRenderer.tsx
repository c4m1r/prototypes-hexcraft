import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { DroppedItem } from '../types/game';

interface DroppedItemsRendererProps {
  droppedItems: DroppedItem[];
}

const DroppedItemsRenderer: React.FC<DroppedItemsRendererProps> = ({ droppedItems }) => {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const itemsRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    // Создаем сцену для предметов (если нужно)
    if (!sceneRef.current) {
      sceneRef.current = new THREE.Scene();
    }

    const scene = sceneRef.current;
    const itemsMap = itemsRef.current;

    // Удаляем старые предметы
    itemsMap.forEach((mesh) => {
      scene.remove(mesh);
    });
    itemsMap.clear();

    // Создаем новые предметы
    droppedItems.forEach((item) => {
      const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const material = new THREE.MeshLambertMaterial({
        color: item.item.color || '#666',
        transparent: true,
        opacity: 0.8
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(item.position.x, item.position.y + 0.15, item.position.z);

      // Добавляем легкую анимацию (вращение)
      mesh.rotation.y += Date.now() * 0.001;

      scene.add(mesh);
      itemsMap.set(item.id, mesh);
    });

    // Возвращаем функцию очистки
    return () => {
      itemsMap.forEach((mesh) => {
        scene.remove(mesh);
      });
      itemsMap.clear();
    };
  }, [droppedItems]);

  // Этот компонент не рендерит ничего видимого в React,
  // он только управляет Three.js объектами
  return null;
};

export default DroppedItemsRenderer;
