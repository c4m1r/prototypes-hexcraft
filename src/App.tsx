import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from './game/Game';
import { GameUI } from './components/GameUI';
import { MainMenu } from './components/MainMenu';
import { AboutPage } from './components/AboutPage';
import { OptionsPage } from './components/OptionsPage';
import { GameSettings, DEFAULT_SETTINGS } from './types/settings';

type Screen = 'menu' | 'game' | 'about' | 'options';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showDebug, setShowDebug] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
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
    setShowHelpHint(true);
    setCurrentScreen('game');
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
    gameRef.current = null;
  };

  return (
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
  );
}

export default App;
