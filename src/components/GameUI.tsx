import { useState, useEffect } from 'react';
import Inventory from './Inventory';
import { InventorySlot, EquipmentSlot } from '../types/game';
import { useLanguage } from '../contexts/LanguageContext';
import './Inventory.css';

interface GameUIProps {
  showDebug: boolean;
  playerPosition: { x: number; y: number; z: number };
  isFlying: boolean;
  targetBlock: string | null;
  targetBiome: string | null;
  showFogBarrier: boolean;
  currentTime: string;
  showHelpHint?: boolean;
  health: number;
  stamina: number;
  hunger: number;
  generationCode: string;
  generationStatus: string;
  playerState: any; // TODO: типизировать
  inventoryOpen: boolean;
  onInventoryToggle: () => void;
  onInventoryChange: (inventory: InventorySlot[]) => void;
  onHotbarChange: (hotbar: InventorySlot[]) => void;
  onEquipmentChange: (equipment: EquipmentSlot[]) => void;
}

export function GameUI({
  showDebug,
  playerPosition,
  isFlying,
  targetBlock,
  targetBiome,
  showFogBarrier,
  currentTime,
  showHelpHint = false,
  health,
  stamina,
  hunger,
  generationCode,
  generationStatus,
  playerState,
  inventoryOpen,
  onInventoryToggle,
  onInventoryChange,
  onHotbarChange,
  onEquipmentChange
}: GameUIProps) {
  const { t } = useLanguage();
  const [helpVisible, setHelpVisible] = useState(showHelpHint);

  useEffect(() => {
    if (showHelpHint) {
      setHelpVisible(true);
      const timer = setTimeout(() => setHelpVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showHelpHint]);

  // Обработчик клавиши TAB для открытия инвентаря
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        onInventoryToggle();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onInventoryToggle]);

  return (
    <>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-8 h-8">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/80"></div>
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/80"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
        </div>
      </div>

      {helpVisible && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 text-white px-8 py-4 rounded-lg text-lg font-medium pointer-events-none border-2 border-white animate-fade-out">
          Press ~ for help
        </div>
      )}

      {/* Статус-бары: здоровье, энергия, голод */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 pointer-events-none w-64">
        <div className="flex items-center gap-3">
          <span className="text-xl">❤️</span>
          <div className="relative flex-1 h-4 bg-black/40 rounded-full border border-white/20 overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full opacity-80"
              style={{ width: `${Math.max(0, Math.min(health, 100))}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/90 font-semibold">
              {Math.round(health)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl text-green-300">⚡</span>
          <div className="relative flex-1 h-4 bg-black/40 rounded-full border border-white/20 overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full opacity-80"
              style={{ width: `${Math.max(0, Math.min(stamina, 100))}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/90 font-semibold">
              {Math.round(stamina)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl">🍞</span>
          <div className="relative flex-1 h-4 bg-black/40 rounded-full border border-white/20 overflow-hidden">
            <div
              className="h-full rounded-full opacity-80"
              style={{ width: `${Math.max(0, Math.min(hunger, 100))}%`, backgroundColor: '#d7c28a' }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white/90 font-semibold">
              {Math.round(hunger)}
            </span>
          </div>
        </div>
      </div>

      {/* Хотбар */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 rounded-lg p-2 pointer-events-none">
        {playerState?.hotbar?.map((slot, index) => (
          <div
            key={index}
            className={`w-12 h-12 border-2 rounded flex items-center justify-center text-white text-sm font-bold ${
              index === 0 ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/30'
            }`}
          >
            {slot.item && (
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: slot.item.color || '#666' }}
              />
            )}
            {slot.count > 1 && (
              <div className="absolute bottom-0 right-0 bg-black/80 text-white text-xs px-1 rounded">
                {slot.count}
              </div>
            )}
            {slot.item?.infinite && (
              <div className="absolute top-0 right-0 text-yellow-400 text-sm font-bold">
                ∞
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Инвентарь */}
      <Inventory
        isOpen={inventoryOpen}
        onClose={onInventoryToggle}
        playerState={playerState}
        onInventoryChange={onInventoryChange}
        onHotbarChange={onHotbarChange}
        onEquipmentChange={onEquipmentChange}
      />

      {showDebug ? (
        <div className="fixed left-8 top-8 bg-black/70 text-white px-4 py-3 rounded-lg text-xs space-y-2 pointer-events-none border border-white/30 font-mono">
          <div className="font-bold text-white border-b border-white/30 pb-2">
            {t.gameUI.time}: {currentTime}
          </div>

          <div className="pt-1 text-green-300 font-semibold">
            {t.gameUI.generationCode}: {generationCode}
          </div>
          <div className="text-xs text-gray-200 pb-2">
            {t.gameUI.generationStatus}: {generationStatus}
          </div>

          <div>X: {playerPosition.x.toFixed(2)}</div>
          <div>Y: {playerPosition.y.toFixed(2)}</div>
          <div>Z: {playerPosition.z.toFixed(2)}</div>

          <div className="pt-2 border-t border-white/30">
            {t.gameUI.mode}: {isFlying ? t.gameUI.fly : t.gameUI.walk}
          </div>

          {targetBlock && (
            <div className="pt-2 border-t border-white/30 font-medium text-green-400">
              {t.gameUI.block}: {targetBlock}
            </div>
          )}

          {targetBiome && (
            <div className="pt-1 border-t border-white/30 text-sm text-blue-400">
              {t.gameUI.biome}: {targetBiome}
            </div>
          )}

          <div className="pt-2 border-t border-white/30 text-xs text-gray-300">
            F: Fog {showFogBarrier ? t.gameUI.fogOn : t.gameUI.fogOff}
          </div>

          <div className="pt-2 border-t border-white/30 text-xs">
            ~ - {t.gameUI.toggleDebug} | ESC - {t.gameUI.closeMenu}
          </div>
        </div>
      ) : (
        <div className="fixed top-8 left-8 bg-black/70 text-white px-4 py-2 rounded-lg text-sm space-y-1 pointer-events-none border border-white/30">
          <div>{t.gameUI.move}</div>
          <div>{t.gameUI.toggleFlyWalk}</div>
          <div>{t.gameUI.jumpWalk}</div>
          <div>{t.gameUI.downFly}</div>
          <div>{t.gameUI.breakBlock}</div>
          <div>{t.gameUI.placeBlock}</div>
          <div>{t.gameUI.pickupItems}</div>
          <div>{t.gameUI.selectBlock}</div>
          <div>{t.gameUI.inventory}</div>
          <div>{t.gameUI.toggleRenderingMode}</div>
          <div>{t.gameUI.toggleDebug}</div>
          <div>{t.gameUI.toggleFogBarrier}</div>
          <div>{t.gameUI.closeMenu}</div>
        </div>
      )}
    </>
  );
}
