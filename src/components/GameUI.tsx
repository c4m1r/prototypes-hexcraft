import { useState, useEffect } from 'react';
import Inventory from './Inventory';
import { InventorySlot } from '../types/game';
import './Inventory.css';

interface GameUIProps {
  showDebug: boolean;
  playerPosition: { x: number; y: number; z: number };
  isFlying: boolean;
  targetBlock: string | null;
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
}

export function GameUI({
  showDebug,
  playerPosition,
  isFlying,
  targetBlock,
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
  onHotbarChange
}: GameUIProps) {
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

      <div id="hotbar" className="fixed bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"></div>

      {/* Инвентарь */}
      <Inventory
        isOpen={inventoryOpen}
        onClose={onInventoryToggle}
        playerState={playerState}
        onInventoryChange={onInventoryChange}
        onHotbarChange={onHotbarChange}
      />

      {showDebug ? (
        <div className="fixed left-8 top-8 bg-black/70 text-white px-4 py-3 rounded-lg text-xs space-y-2 pointer-events-none border border-white/30 font-mono">
          <div className="font-bold text-white border-b border-white/30 pb-2">
            TIME: {currentTime}
          </div>

          <div className="pt-1 text-green-300 font-semibold">
            Generation code: {generationCode}
          </div>
          <div className="text-xs text-gray-200 pb-2">
            Generation status: {generationStatus}
          </div>

          <div>X: {playerPosition.x.toFixed(2)}</div>
          <div>Y: {playerPosition.y.toFixed(2)}</div>
          <div>Z: {playerPosition.z.toFixed(2)}</div>

          <div className="pt-2 border-t border-white/30">
            Mode: {isFlying ? 'FLY' : 'WALK'}
          </div>

          {targetBlock && (
            <div className="pt-2 border-t border-white/30 font-medium text-green-400">
              Block: {targetBlock}
            </div>
          )}

          <div className="pt-2 border-t border-white/30 text-xs text-gray-300">
            F: Fog {showFogBarrier ? 'ON' : 'OFF'}
          </div>

          <div className="pt-2 border-t border-white/30 text-xs">
            ~ - Close | ESC - Menu
          </div>
        </div>
      ) : (
        <div className="fixed top-8 left-8 bg-black/70 text-white px-4 py-2 rounded-lg text-sm space-y-1 pointer-events-none border border-white/30">
          <div>WASD - Move</div>
          <div>Space (2x) - Toggle Fly/Walk</div>
          <div>Space - Jump (Walk) / Up (Fly)</div>
          <div>Shift - Down (Fly)</div>
          <div>Left Click - Break Block</div>
          <div>Right Click - Place Block</div>
          <div>E - Pickup Items</div>
          <div>1-9,0 - Select Block</div>
          <div>TAB - Inventory</div>
          <div>~ - Toggle Debug</div>
          <div>F - Toggle Fog Barrier</div>
          <div>ESC - Menu</div>
        </div>
      )}
    </>
  );
}
