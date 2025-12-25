import React, { useState, useEffect, useCallback } from 'react';
import { Item, InventorySlot, EquipmentSlot as EquipmentSlotType, Player } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: any; // TODO: типизировать
  onInventoryChange: (inventory: InventorySlot[]) => void;
  onHotbarChange: (hotbar: InventorySlot[]) => void;
  onEquipmentChange: (equipment: EquipmentSlot[]) => void;
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
  onEquipmentChange,
  onItemPickup
}) => {
  const { t } = useLanguage();
  const [draggedItem, setDraggedItem] = useState<{ item: Item; count: number; fromSlot: number; fromType: 'inventory' | 'hotbar' } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ item: Item; x: number; y: number } | null>(null);
  // Только текущий игрок (в будущем можно добавить реальных игроков)
  const [players] = useState<Player[]>([
    { id: '1', name: playerState?.name || 'Player', position: { x: 0, y: 0, z: 0 }, isOnline: true }
  ]);

  // Инициализация инвентаря если не существует
  useEffect(() => {
    if (!playerState.inventory || playerState.inventory.length !== INVENTORY_SIZE) {
      const emptyInventory = Array(INVENTORY_SIZE).fill(null).map(() => ({ item: null, count: 0 }));
      // Добавим несколько тестовых предметов
      emptyInventory[0] = { item: { id: 'stone', name: t.inventory.stoneBlock, type: 'block', stackSize: 64, maxStackSize: 64, rarity: 'common', color: '#7a7a7a' }, count: 64 };
      emptyInventory[1] = { item: { id: 'wood', name: t.inventory.woodBlock, type: 'block', stackSize: 32, maxStackSize: 64, rarity: 'common', color: '#6b4423' }, count: 32 };
      emptyInventory[2] = { item: { id: 'bronze', name: t.inventory.bronzeOre, type: 'material', stackSize: 16, maxStackSize: 64, rarity: 'uncommon', color: '#cd7f32' }, count: 16 };
      onInventoryChange(emptyInventory);
    }

    if (!playerState.hotbar || playerState.hotbar.length !== HOTBAR_SIZE) {
      const emptyHotbar = Array(HOTBAR_SIZE).fill(null).map(() => ({ item: null, count: 0 }));
      // Хоткеи с бесконечными предметами
      const infiniteItems = [
        { id: 'grass', name: t.inventory.grassBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#4a7c3a', infinite: true },
        { id: 'dirt', name: t.inventory.dirtBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#8b5a3c', infinite: true },
        { id: 'stone', name: t.inventory.stoneBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#7a7a7a', infinite: true },
        { id: 'sand', name: t.inventory.sandBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ddc689', infinite: true },
        { id: 'wood', name: t.inventory.woodBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#6b4423', infinite: true },
        { id: 'leaves', name: t.inventory.leavesBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#2d5016', infinite: true },
        { id: 'snow', name: t.inventory.snowBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#e8f2f7', infinite: true },
        { id: 'ice', name: t.inventory.iceBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#b8d8e8', infinite: true },
        { id: 'lava', name: t.inventory.lavaBlock, type: 'block', stackSize: 1, maxStackSize: 1, rarity: 'common', color: '#ff4500', infinite: true },
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
    onClick: (event: React.MouseEvent, index: number, type: 'inventory' | 'hotbar') => void;
  }> = ({ slot, index, type, onClick }) => {
    const isDragOver = dragOverSlot === index;
    const isDraggedFrom = draggedItem?.fromSlot === index && draggedItem?.fromType === type;

    return (
      <div
        className={`hexagon-slot ${isDragOver ? 'drag-over' : ''} ${isDraggedFrom ? 'dragged-from' : ''}`}
        onClick={(e) => onClick(e, index, type)}
        onContextMenu={(e) => onClick(e, index, type)}
        onMouseEnter={(e) => {
          if (slot.item) {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
              item: slot.item,
              x: rect.left + rect.width / 2,
              y: rect.top - 10
            });
          }
        }}
        onMouseLeave={() => setTooltip(null)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverSlot(index);
        }}
        onDragLeave={() => setDragOverSlot(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverSlot(null);
          if (draggedItem) {
            handleDrop(index, type, draggedItem);
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

  const handleSlotClick = useCallback((event: React.MouseEvent, index: number, type: 'inventory' | 'hotbar') => {
    event.preventDefault();

    const inventory = type === 'inventory' ? playerState.inventory : playerState.hotbar;
    const slot = inventory[index];

    if (!slot.item) return;

    // Правая кнопка мыши - разделить стак
    if (event.button === 2 && slot.count > 1) {
      const halfCount = Math.ceil(slot.count / 2);
      const remainingCount = slot.count - halfCount;

      // Обновляем текущий слот
      const newInventory = [...inventory];
      newInventory[index] = { item: slot.item, count: remainingCount };

      if (type === 'inventory') {
        onInventoryChange(newInventory);
      } else {
        onHotbarChange(newInventory);
      }
    }
  }, [playerState, onInventoryChange, onHotbarChange]);

  const handleDrop = useCallback((toIndex: number, toType: 'inventory' | 'hotbar', draggedItemParam: typeof draggedItem) => {
    if (!draggedItemParam) return;

    const fromInventory = draggedItemParam.fromType === 'inventory' ? playerState.inventory : playerState.hotbar;
    const toInventory = toType === 'inventory' ? playerState.inventory : playerState.hotbar;

    // Если перетаскиваем в тот же слот - ничего не делаем
    if (draggedItemParam.fromSlot === toIndex && draggedItemParam.fromType === toType) {
      return;
    }

    // Создаем копии инвентарей
    const newFromInventory = [...fromInventory];
    const newToInventory = [...toInventory];

    const targetSlot = newToInventory[toIndex];

    // Если целевой слот занят тем же предметом - складываем
    if (targetSlot.item && targetSlot.item.id === draggedItemParam.item.id) {
      const maxStackSize = draggedItemParam.item.maxStackSize;
      const currentCount = targetSlot.count;
      const draggedCount = draggedItemParam.count;
      const totalCount = currentCount + draggedCount;

      if (totalCount <= maxStackSize) {
        // Весь стаск помещается
        newToInventory[toIndex] = { item: draggedItemParam.item, count: totalCount };
        newFromInventory[draggedItemParam.fromSlot] = { item: null, count: 0 };
      } else {
        // Частично помещается
        newToInventory[toIndex] = { item: draggedItemParam.item, count: maxStackSize };
        newFromInventory[draggedItemParam.fromSlot] = {
          item: draggedItemParam.item,
          count: totalCount - maxStackSize
        };
      }
    } else {
      // Обмен предметами или перемещение в пустой слот
      newFromInventory[draggedItemParam.fromSlot] = targetSlot;
      newToInventory[toIndex] = { item: draggedItemParam.item, count: draggedItemParam.count };
    }

    // Обновляем инвентари
    if (draggedItemParam.fromType === 'inventory') {
      onInventoryChange(newFromInventory);
    } else {
      onHotbarChange(newFromInventory);
    }

    if (toType === 'inventory') {
      onInventoryChange(newToInventory);
    } else {
      onHotbarChange(newToInventory);
    }
  }, [draggedItem, playerState, onInventoryChange, onHotbarChange]);

  if (!isOpen) return null;

  // Компонент слота экипировки
  const EquipmentSlot: React.FC<{
    slot: EquipmentSlotType;
    onClick: () => void;
  }> = ({ slot, onClick }) => {
    return (
      <div className="equipment-slot" onClick={onClick}>
        <div className="equipment-slot-content">
          {slot.item && (
            <div
              className="equipment-item-icon"
              style={{ backgroundColor: slot.item.color || '#666' }}
            />
          )}
        </div>
        <div className="equipment-slot-name">{slot.name}</div>
      </div>
    );
  };

  return (
    <div className="inventory-overlay" onClick={onClose}>
      <div className="inventory-container" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="inventory-header">
          <h2>Inventory</h2>
          <div className="inventory-help">
            <small>Right-click to split stack • Drag & drop to move items</small>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="inventory-content">
          {/* Список игроков */}
          <div className="players-panel">
            <h3>{t.inventory.playersOnline}</h3>
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

          {/* Персонаж и экипировка */}
          <div className="character-equipment-panel">
            {/* Персонаж - левая сторона */}
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

            {/* Экипировка - правая сторона */}
            <div className="equipment-panel">
              {/* Шлем и артефакты */}
              <div className="equipment-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[0] || { type: 'helmet', item: null, name: t.inventory.helmet }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[5] || { type: 'artifact1', item: null, name: t.inventory.artifact1 }}
                  onClick={() => {}}
                />
              </div>

              {/* Нагрудник и vanity (костюм поверх брони) */}
              <div className="equipment-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[1] || { type: 'chestplate', item: null, name: t.inventory.chestplate }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[8] || { type: 'vanity1', item: null, name: t.inventory.vanity1 }}
                  onClick={() => {}}
                />
              </div>

              {/* Поножи и vanity */}
              <div className="equipment-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[2] || { type: 'leggings', item: null, name: t.inventory.leggings }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[9] || { type: 'vanity2', item: null, name: t.inventory.vanity2 }}
                  onClick={() => {}}
                />
              </div>

              {/* Ботинки и vanity */}
              <div className="equipment-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[3] || { type: 'boots', item: null, name: t.inventory.boots }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[10] || { type: 'vanity3', item: null, name: t.inventory.vanity3 }}
                  onClick={() => {}}
                />
              </div>

              {/* Плащ и vanity */}
              <div className="equipment-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[4] || { type: 'cape', item: null, name: t.inventory.cape }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[11] || { type: 'vanity4', item: null, name: t.inventory.vanity4 }}
                  onClick={() => {}}
                />
              </div>

              {/* Артефакты по центру */}
              <div className="equipment-row artifacts-row">
                <EquipmentSlot
                  slot={playerState.equipment?.[6] || { type: 'artifact2', item: null, name: t.inventory.artifact2 }}
                  onClick={() => {}}
                />
                <EquipmentSlot
                  slot={playerState.equipment?.[7] || { type: 'artifact3', item: null, name: t.inventory.artifact3 }}
                  onClick={() => {}}
                />
              </div>
            </div>
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
                  onClick={(e, idx, type) => handleSlotClick(e, idx, type)}
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
                onClick={(e, idx, type) => handleSlotClick(e, idx, type)}
              />
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="item-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y
            }}
          >
            <div className="item-tooltip-name">{tooltip.item.name}</div>
            <div className="item-tooltip-type">{tooltip.item.type}</div>
            <div className="item-tooltip-rarity" data-rarity={tooltip.item.rarity}>
              {tooltip.item.rarity}
            </div>
            {tooltip.item.maxStackSize > 1 && (
              <div className="item-tooltip-stack">Stack: {tooltip.item.maxStackSize}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
