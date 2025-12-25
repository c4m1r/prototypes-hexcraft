import React, { useState, useEffect, useCallback } from 'react';
import { Item, InventorySlot, Player } from '../types/game';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: any; // TODO: типизировать
  onInventoryChange: (inventory: InventorySlot[]) => void;
  onHotbarChange: (hotbar: InventorySlot[]) => void;
  onItemPickup?: (item: Item) => void;
}

const INVENTORY_SIZE = 27;
const HOTBAR_SIZE = 9;

const Inventory: React.FC<InventoryProps> = ({
  isOpen,
  onClose,
  playerState,
  onInventoryChange,
  onHotbarChange,
  onItemPickup
}) => {
  const [draggedItem, setDraggedItem] = useState<{ item: Item; count: number; fromSlot: number; fromType: 'inventory' | 'hotbar' } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [players] = useState<Player[]>([
    { id: '1', name: playerState?.name || 'Player', position: { x: 0, y: 0, z: 0 }, isOnline: true },
    // Моковые игроки для демонстрации
    { id: '2', name: 'Steve', position: { x: 10, y: 0, z: 5 }, isOnline: true },
    { id: '3', name: 'Alex', position: { x: -5, y: 0, z: 10 }, isOnline: false },
  ]);

  // Инициализация инвентаря если не существует
  useEffect(() => {
    if (!playerState.inventory || playerState.inventory.length !== INVENTORY_SIZE) {
      const emptyInventory = Array(INVENTORY_SIZE).fill(null).map(() => ({ item: null, count: 0 }));
      // Добавим несколько тестовых предметов
      emptyInventory[0] = { item: { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 64, maxStackSize: 64, rarity: 'common', color: '#7a7a7a' }, count: 64 };
      emptyInventory[1] = { item: { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 32, maxStackSize: 64, rarity: 'common', color: '#6b4423' }, count: 32 };
      emptyInventory[2] = { item: { id: 'bronze', name: 'Bronze Ore', type: 'material', stackSize: 16, maxStackSize: 64, rarity: 'uncommon', color: '#cd7f32' }, count: 16 };
      onInventoryChange(emptyInventory);
    }

    if (!playerState.hotbar || playerState.hotbar.length !== HOTBAR_SIZE) {
      const emptyHotbar = Array(HOTBAR_SIZE).fill(null).map(() => ({ item: null, count: 0 }));
      // Хоткеи с бесконечными предметами
      const infiniteItems = [
        { id: 'grass', name: 'Grass Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#4a7c3a', infinite: true },
        { id: 'dirt', name: 'Dirt Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#8b5a3c', infinite: true },
        { id: 'stone', name: 'Stone Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#7a7a7a', infinite: true },
        { id: 'sand', name: 'Sand Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ddc689', infinite: true },
        { id: 'wood', name: 'Wood Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#6b4423', infinite: true },
        { id: 'leaves', name: 'Leaves Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#2d5016', infinite: true },
        { id: 'snow', name: 'Snow Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#e8f2f7', infinite: true },
        { id: 'ice', name: 'Ice Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#b8d8e8', infinite: true },
        { id: 'lava', name: 'Lava Block', type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ff4500', infinite: true },
      ];

      emptyHotbar.forEach((slot, index) => {
        if (infiniteItems[index]) {
          slot.item = infiniteItems[index];
          slot.count = infiniteItems[index].maxStackSize;
        }
      });

      onHotbarChange(emptyHotbar);
    }
  }, [playerState, onInventoryChange, onHotbarChange]);

  // Обработчик клавиши ESC
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  // Гексагональный слот
  const HexagonSlot: React.FC<{
    slot: InventorySlot;
    index: number;
    type: 'inventory' | 'hotbar';
    onClick: (index: number, type: 'inventory' | 'hotbar') => void;
  }> = ({ slot, index, type, onClick }) => {
    const isDragOver = dragOverSlot === index && draggedItem?.fromType !== type;
    const isDraggedFrom = draggedItem?.fromSlot === index && draggedItem?.fromType === type;

    return (
      <div
        className={`hexagon-slot ${isDragOver ? 'drag-over' : ''} ${isDraggedFrom ? 'dragged-from' : ''}`}
        onClick={() => onClick(index, type)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverSlot(index);
        }}
        onDragLeave={() => setDragOverSlot(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverSlot(null);
          if (draggedItem) {
            handleDrop(index, type);
          }
        }}
        draggable={!!slot.item}
        onDragStart={(e) => {
          if (slot.item) {
            setDraggedItem({ item: slot.item, count: slot.count, fromSlot: index, fromType: type });
          }
        }}
        onDragEnd={() => setDraggedItem(null)}
      >
        <div className="hexagon-content">
          {slot.item && (
            <>
              <div
                className="item-icon"
                style={{ backgroundColor: slot.item.color || '#666' }}
              />
              {slot.count > 1 && <div className="item-count">{slot.count}</div>}
              {slot.item.infinite && <div className="infinity-symbol">∞</div>}
            </>
          )}
        </div>
      </div>
    );
  };

  const handleSlotClick = useCallback((index: number, type: 'inventory' | 'hotbar') => {
    // TODO: Реализовать логику клика по слоту
    console.log(`Clicked ${type} slot ${index}`);
  }, []);

  const handleDrop = useCallback((toIndex: number, toType: 'inventory' | 'hotbar') => {
    if (!draggedItem) return;

    const fromInventory = draggedItem.fromType === 'inventory' ? playerState.inventory : playerState.hotbar;
    const toInventory = toType === 'inventory' ? playerState.inventory : playerState.hotbar;

    // Если перетаскиваем в тот же слот - ничего не делаем
    if (draggedItem.fromSlot === toIndex && draggedItem.fromType === toType) return;

    // Создаем копии инвентарей
    const newFromInventory = [...fromInventory];
    const newToInventory = [...toInventory];

    // Удаляем из исходного слота
    newFromInventory[draggedItem.fromSlot] = { item: null, count: 0 };

    // Добавляем в целевой слот
    newToInventory[toIndex] = { item: draggedItem.item, count: draggedItem.count };

    // Обновляем инвентари
    if (draggedItem.fromType === 'inventory') {
      onInventoryChange(newFromInventory);
    } else {
      onHotbarChange(newFromInventory);
    }

    if (toType === 'inventory') {
      onInventoryChange(newToInventory);
    } else {
      onHotbarChange(newToInventory);
    }

    setDraggedItem(null);
  }, [draggedItem, playerState, onInventoryChange, onHotbarChange]);

  if (!isOpen) return null;

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-container" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="inventory-header">
          <h2>Inventory</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="inventory-content">
          {/* Список игроков */}
          <div className="players-panel">
            <h3>Players Online</h3>
            <div className="players-list">
              {players.map(player => (
                <div key={player.id} className={`player-item ${player.isOnline ? 'online' : 'offline'}`}>
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="player-info">
                    <div className="player-name">{player.name}</div>
                    <div className="player-status">
                      {player.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Персонаж */}
          <div className="character-panel">
            <div className="character-preview">
              <div className="character-body">
                <div className="character-head"></div>
                <div className="character-torso"></div>
                <div className="character-legs"></div>
              </div>
            </div>
            <div className="character-name">{playerState?.name || 'Player'}</div>
          </div>

          {/* Инвентарь */}
          <div className="inventory-panel">
            <div className="inventory-grid">
              {playerState.inventory?.map((slot, index) => (
                <HexagonSlot
                  key={`inv-${index}`}
                  slot={slot}
                  index={index}
                  type="inventory"
                  onClick={handleSlotClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Хоткеи */}
        <div className="hotbar-panel">
          <div className="hotbar-grid">
            {playerState.hotbar?.map((slot, index) => (
              <HexagonSlot
                key={`hot-${index}`}
                slot={slot}
                index={index}
                type="hotbar"
                onClick={handleSlotClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
