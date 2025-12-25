import { useState } from 'react';
import { GameSettings, DEFAULT_SETTINGS, SETTINGS_CONSTRAINTS } from '../types/settings';
import { useLanguage } from '../contexts/LanguageContext';
import { Language, languageNames } from '../utils/i18n';

interface OptionsPageProps {
  onBack: () => void;
  onSave: (settings: GameSettings) => void;
  currentSettings: GameSettings;
}

export function OptionsPage({ onBack, onSave, currentSettings }: OptionsPageProps) {
  const { t, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<GameSettings>(currentSettings);

  const handleChange = (key: keyof GameSettings, value: number) => {
    const constraint = SETTINGS_CONSTRAINTS[key];
    const clampedValue = Math.max(constraint.min, Math.min(constraint.max, value));
    setSettings({ ...settings, [key]: clampedValue });
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setSettings({ ...settings, language: lang });
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
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">{t.options.title}</h1>

        <div className="space-y-3">
          {/* Language Selection */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.language}</div>
              <select
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="w-full bg-gray-800 border border-white/20 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/40"
              >
                {Object.entries(languageNames).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Render Distance */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.renderDistance}</div>
              <div className="text-xs text-gray-400 mb-2">{t.options.renderDistanceDesc}</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.renderDistance.min}
                  max={SETTINGS_CONSTRAINTS.renderDistance.max}
                  value={settings.renderDistance}
                  onChange={(e) => handleChange('renderDistance', parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold w-8 text-right">{settings.renderDistance}</span>
              </div>
            </label>
          </div>

          {/* Fog Density */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.fogDensity}</div>
              <div className="text-xs text-gray-400 mb-2">{t.options.fogDensityDesc}</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.fogDensity.min}
                  max={SETTINGS_CONSTRAINTS.fogDensity.max}
                  step={SETTINGS_CONSTRAINTS.fogDensity.step}
                  value={settings.fogDensity}
                  onChange={(e) => handleChange('fogDensity', parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold w-12 text-right">{settings.fogDensity.toFixed(1)}</span>
              </div>
            </label>
          </div>

          {/* Biome Size */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.biomeSize}</div>
              <div className="text-xs text-gray-400 mb-2">{t.options.biomeSizeDesc}</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.biomeSize.min}
                  max={SETTINGS_CONSTRAINTS.biomeSize.max}
                  step={SETTINGS_CONSTRAINTS.biomeSize.step}
                  value={settings.biomeSize}
                  onChange={(e) => handleChange('biomeSize', parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold w-12 text-right">{settings.biomeSize.toFixed(1)}</span>
              </div>
            </label>
          </div>

          {/* Chunk Size */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.chunkSize}</div>
              <div className="text-xs text-gray-400 mb-2">{t.options.chunkSizeDesc}</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.chunkSize.min}
                  max={SETTINGS_CONSTRAINTS.chunkSize.max}
                  step={SETTINGS_CONSTRAINTS.chunkSize.step}
                  value={settings.chunkSize}
                  onChange={(e) => handleChange('chunkSize', parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold w-8 text-right">{settings.chunkSize}</span>
              </div>
            </label>
          </div>

          {/* Max Loaded Chunks */}
          <div className="bg-gray-900 p-3 rounded-lg border border-white/20">
            <label className="block">
              <div className="text-sm font-semibold mb-1">{t.options.maxLoadedChunks}</div>
              <div className="text-xs text-gray-400 mb-2">{t.options.maxLoadedChunksDesc}</div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={SETTINGS_CONSTRAINTS.maxLoadedChunks.min}
                  max={SETTINGS_CONSTRAINTS.maxLoadedChunks.max}
                  step={SETTINGS_CONSTRAINTS.maxLoadedChunks.step}
                  value={settings.maxLoadedChunks}
                  onChange={(e) => handleChange('maxLoadedChunks', parseInt(e.target.value))}
                  className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg font-bold w-8 text-right">{settings.maxLoadedChunks}</span>
              </div>
            </label>
          </div>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-2 bg-white text-black text-base font-medium hover:bg-gray-200 transition-all duration-300 rounded-lg"
          >
            {t.options.saveSettings}
          </button>

          <button
            onClick={handleReset}
            className="px-6 py-2 bg-transparent border-2 border-white text-white text-base font-medium hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
          >
            {t.options.reset}
          </button>

          <button
            onClick={onBack}
            className="px-6 py-2 bg-transparent border-2 border-white text-white text-base font-medium hover:bg-white hover:text-black transition-all duration-300 rounded-lg"
          >
            {t.options.back}
          </button>
        </div>
      </div>
    </div>
  );
}
