import { useState } from 'react';
import { GameSettings, DEFAULT_SETTINGS, SETTINGS_CONSTRAINTS } from '../types/settings';

interface OptionsPageProps {
  onBack: () => void;
  onSave: (settings: GameSettings) => void;
  currentSettings: GameSettings;
}

export function OptionsPage({ onBack, onSave, currentSettings }: OptionsPageProps) {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);

  const handleChange = (key: keyof GameSettings, value: number) => {
    const constraint = SETTINGS_CONSTRAINTS[key];
    const clampedValue = Math.max(constraint.min, Math.min(constraint.max, value));
    setSettings({ ...settings, [key]: clampedValue });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const handleSave = () => {
    onSave(settings);
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-auto">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-12">Settings</h1>

        <div className="space-y-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-4">
              <div className="text-lg font-semibold mb-2">Render Distance</div>
              <div className="text-sm text-gray-400 mb-3">
                Number of chunks loaded around the player (1-7)
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.renderDistance.min}
                  max={SETTINGS_CONSTRAINTS.renderDistance.max}
                  value={settings.renderDistance}
                  onChange={(e) => handleChange('renderDistance', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-12 text-right">{settings.renderDistance}</span>
              </div>
            </label>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-4">
              <div className="text-lg font-semibold mb-2">Fog Density</div>
              <div className="text-sm text-gray-400 mb-3">
                How thick the fog is (0.1-2.0)
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.fogDensity.min}
                  max={SETTINGS_CONSTRAINTS.fogDensity.max}
                  step={SETTINGS_CONSTRAINTS.fogDensity.step}
                  value={settings.fogDensity}
                  onChange={(e) => handleChange('fogDensity', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-12 text-right">{settings.fogDensity.toFixed(1)}</span>
              </div>
            </label>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-4">
              <div className="text-lg font-semibold mb-2">Biome Size</div>
              <div className="text-sm text-gray-400 mb-3">
                Scale of biome regions (0.5-2.0)
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.biomeSize.min}
                  max={SETTINGS_CONSTRAINTS.biomeSize.max}
                  step={SETTINGS_CONSTRAINTS.biomeSize.step}
                  value={settings.biomeSize}
                  onChange={(e) => handleChange('biomeSize', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-12 text-right">{settings.biomeSize.toFixed(1)}</span>
              </div>
            </label>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-4">
              <div className="text-lg font-semibold mb-2">Chunk Size</div>
              <div className="text-sm text-gray-400 mb-3">
                Hexagons per chunk (8-20)
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.chunkSize.min}
                  max={SETTINGS_CONSTRAINTS.chunkSize.max}
                  step={SETTINGS_CONSTRAINTS.chunkSize.step}
                  value={settings.chunkSize}
                  onChange={(e) => handleChange('chunkSize', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-12 text-right">{settings.chunkSize}</span>
              </div>
            </label>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg border border-white/20">
            <label className="block mb-4">
              <div className="text-lg font-semibold mb-2">Max Loaded Chunks</div>
              <div className="text-sm text-gray-400 mb-3">
                Maximum chunks in memory (5-30)
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.maxLoadedChunks.min}
                  max={SETTINGS_CONSTRAINTS.maxLoadedChunks.max}
                  step={SETTINGS_CONSTRAINTS.maxLoadedChunks.step}
                  value={settings.maxLoadedChunks}
                  onChange={(e) => handleChange('maxLoadedChunks', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xl font-bold w-12 text-right">{settings.maxLoadedChunks}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-4 mt-12">
          <button
            onClick={handleSave}
            className="flex-1 px-8 py-3 bg-white text-black text-lg font-medium hover:bg-gray-200 transition-all duration-300 rounded-lg"
          >
            Save Settings
          </button>

          <button
            onClick={handleReset}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
          >
            Reset
          </button>

          <button
            onClick={onBack}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
