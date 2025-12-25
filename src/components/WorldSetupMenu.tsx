import { useState, useEffect } from 'react';
import { RenderingMode, GameMode, WorldSetup } from '../types/settings';
import { useLanguage } from '../contexts/LanguageContext';

interface WorldSetupMenuProps {
  onStart: (setup: WorldSetup) => void;
  onBack: () => void;
  defaultRenderingMode: RenderingMode;
}

export function WorldSetupMenu({ onStart, onBack, defaultRenderingMode }: WorldSetupMenuProps) {
  const { t } = useLanguage();
  const [playerName, setPlayerName] = useState<string>('');
  const [gameMode, setGameMode] = useState<GameMode>('Solo');
  const [renderingMode, setRenderingMode] = useState<RenderingMode>(defaultRenderingMode);
  const [seed, setSeed] = useState<string>('');

  // Генерируем случайный seed при первом рендере
  useEffect(() => {
    if (!seed) {
      const randomSeed = Math.floor(Math.random() * 1_000_000_000);
      setSeed(randomSeed.toString());
    }
  }, [seed]);

  const handleSeedChange = (value: string) => {
    // Разрешаем только числовые значения и знак минус в начале
    if (value === '' || value === '-') {
      setSeed(value);
      return;
    }
    const numericValue = value.replace(/[^0-9-]/g, '');
    // Убеждаемся, что минус только в начале
    const cleanedValue = numericValue.startsWith('-') 
      ? '-' + numericValue.slice(1).replace(/[^0-9]/g, '')
      : numericValue.replace(/[^0-9]/g, '');
    setSeed(cleanedValue);
  };

  const handleRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1_000_000_000);
    setSeed(randomSeed.toString());
  };

  const handleStart = () => {
    let finalSeed: number;
    if (seed && seed !== '-') {
      const seedValue = parseInt(seed, 10);
      finalSeed = isNaN(seedValue) ? Math.floor(Math.random() * 1_000_000_000) : seedValue;
    } else {
      finalSeed = Math.floor(Math.random() * 1_000_000_000);
    }
    
    onStart({
      playerName: playerName.trim() || t.worldSetup.playerNamePlaceholder,
      gameMode,
      renderingMode,
      seed: finalSeed
    });
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative z-10 w-full max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">{t.worldSetup.title}</h1>

        <div className="space-y-6">
          {/* Player Name */}
          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-2">
              <div className="text-lg font-semibold mb-2 text-white">{t.worldSetup.playerName}</div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder={t.worldSetup.playerNamePlaceholder}
                className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                maxLength={32}
              />
            </label>
          </div>

          {/* Game Mode */}
          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-2">
              <div className="text-lg font-semibold mb-2 text-white">{t.worldSetup.gameMode}</div>
              <select
                value={gameMode}
                onChange={(e) => setGameMode(e.target.value as GameMode)}
                className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/40"
              >
                <option value="Solo">{t.worldSetup.gameModeSolo}</option>
                <option value="Co-op">{t.worldSetup.gameModeCoop}</option>
                <option value="Online">{t.worldSetup.gameModeOnline}</option>
              </select>
              <div className="text-sm text-gray-400 mt-2">
                {gameMode === 'Solo' && t.worldSetup.gameModeSoloDesc}
                {gameMode === 'Co-op' && t.worldSetup.gameModeCoopDesc}
                {gameMode === 'Online' && t.worldSetup.gameModeOnlineDesc}
              </div>
            </label>
          </div>

          {/* Rendering Mode */}
          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-2">
              <div className="text-lg font-semibold mb-2 text-white">{t.worldSetup.blockRenderMode}</div>
              <select
                value={renderingMode}
                onChange={(e) => setRenderingMode(e.target.value as RenderingMode)}
                className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-white/40"
              >
                <option value="prototype">{t.worldSetup.renderingModePrototype}</option>
                <option value="modern">{t.worldSetup.renderingModeModern}</option>
              </select>
              <div className="text-sm text-gray-400 mt-2">
                {t.worldSetup.renderingModeDesc}
              </div>
            </label>
          </div>

          {/* World Seed */}
          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-2">
              <div className="text-lg font-semibold mb-2 text-white">{t.worldSetup.worldSeed}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => handleSeedChange(e.target.value)}
                  placeholder={t.worldSetup.worldSeedPlaceholder}
                  className="flex-1 bg-gray-800 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white/40"
                />
                <button
                  onClick={handleRandomSeed}
                  className="px-4 py-2 bg-gray-700 border border-white/20 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
                  title={t.worldSetup.worldSeedPlaceholder}
                >
                  🎲
                </button>
              </div>
              <div className="text-sm text-gray-400 mt-2">
                {t.worldSetup.worldSeedDesc}
              </div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleStart}
            className="flex-1 px-8 py-3 bg-white text-black text-lg font-medium hover:bg-gray-200 transition-all duration-300 rounded-lg"
          >
            {t.worldSetup.startGame}
          </button>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
          >
            {t.worldSetup.back}
          </button>
        </div>
      </div>
    </div>
  );
}

