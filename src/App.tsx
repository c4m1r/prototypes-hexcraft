import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from './game/Game';
import { GameUI } from './components/GameUI';
import { MainMenu } from './components/MainMenu';
import { AboutPage } from './components/AboutPage';
import { OptionsPage } from './components/OptionsPage';
import { WorldSetupMenu } from './components/WorldSetupMenu';
import { GameSettings, DEFAULT_SETTINGS, WorldSetup } from './types/settings';
import { LanguageProvider } from './contexts/LanguageContext';
import { Language } from './utils/i18n';

type Screen = 'menu' | 'worldSetup' | 'game' | 'about' | 'options';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showDebug, setShowDebug] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [gameState, setGameState] = useState<GameState>({
    playerPosition: { x: 0, y: 0, z: 0 },
    isFlying: true,
    targetBlock: null,
    showFogBarrier: true,
    currentTime: '06:00',
    health: 100,
    stamina: 100,
    hunger: 100,
    generationCode: 'seed-0',
    generationStatus: 'chunks:0 meshes:0 rd:0 cs:0/0'
  });

  useEffect(() => {
    settingsRef.current = settings;
    setLanguage(settings.language);
  }, [settings]);

  useEffect(() => {
    if (currentScreen === 'game' && canvasRef.current && !gameRef.current) {
      gameRef.current = new Game(canvasRef.current, (state) => {
        setGameState(state);
      }, settingsRef.current);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Backquote') {
          e.preventDefault();
          setShowDebug(prev => !prev);
        }
        if (e.code === 'Escape') {
          setCurrentScreen('menu');
          gameRef.current = null;
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [currentScreen]);

  const handleNewGame = () => {
    setCurrentScreen('worldSetup');
  };

  const handleWorldSetupStart = (worldSetup: WorldSetup) => {
    // Объединяем настройки мира с текущими настройками игры
    const mergedSettings: GameSettings = {
      ...settingsRef.current,
      renderingMode: worldSetup.renderingMode,
      seed: worldSetup.seed
    };
    settingsRef.current = mergedSettings;
    setSettings(mergedSettings);
    setShowHelpHint(true);
    setCurrentScreen('game');
  };

  const handleWorldSetupBack = () => {
    setCurrentScreen('menu');
  };

  const handleLoadGame = () => {
    alert('Load Game feature coming soon!');
  };

  const handleCoop = () => {
    alert('Co-op feature coming soon!');
  };

  const handleOptions = () => {
    setCurrentScreen('options');
  };

  const handleAbout = () => {
    setCurrentScreen('about');
  };

  const handleBackToMenu = () => {
    setCurrentScreen('menu');
    gameRef.current = null;
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    setLanguage(newSettings.language);
    gameRef.current = null;
  };

  return (
    <LanguageProvider language={language} setLanguage={(lang) => {
      setLanguage(lang);
      setSettings({ ...settings, language: lang });
    }}>
      <div className="relative w-full h-screen overflow-hidden">
      {currentScreen === 'menu' && (
        <MainMenu
          onNewGame={handleNewGame}
          onLoadGame={handleLoadGame}
          onCoop={handleCoop}
          onOptions={handleOptions}
          onAbout={handleAbout}
        />
      )}

      {currentScreen === 'worldSetup' && (
        <WorldSetupMenu
          onStart={handleWorldSetupStart}
          onBack={handleWorldSetupBack}
          defaultRenderingMode={settings.renderingMode}
        />
      )}

      {currentScreen === 'about' && (
        <AboutPage onBack={handleBackToMenu} />
      )}

      {currentScreen === 'options' && (
        <OptionsPage
          onBack={handleBackToMenu}
          onSave={handleSaveSettings}
          currentSettings={settings}
        />
      )}

      {currentScreen === 'game' && (
        <>
          <canvas ref={canvasRef} className="w-full h-full" />
          <GameUI
            showDebug={showDebug}
            playerPosition={gameState.playerPosition}
            isFlying={gameState.isFlying}
            targetBlock={gameState.targetBlock}
            showFogBarrier={gameState.showFogBarrier}
            currentTime={gameState.currentTime}
            showHelpHint={showHelpHint}
            health={gameState.health}
            stamina={gameState.stamina}
            hunger={gameState.hunger}
            generationCode={gameState.generationCode}
            generationStatus={gameState.generationStatus}
          />
        </>
      )}
      </div>
    </LanguageProvider>
  );
}

export default App;
