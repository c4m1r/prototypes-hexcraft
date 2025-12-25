import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from './game/Game';
import { GameUI } from './components/GameUI';
import { MainMenu } from './components/MainMenu';
import { AboutPage } from './components/AboutPage';
import { OptionsPage } from './components/OptionsPage';
import { WorldSetupMenu } from './components/WorldSetupMenu';
import { LoadingScreen } from './components/LoadingScreen';
import { GameSettings, DEFAULT_SETTINGS, WorldSetup } from './types/settings';
import { LanguageProvider } from './contexts/LanguageContext';
import { Language } from './utils/i18n';
import { World } from './game/World';
import * as THREE from 'three';
import { hexToWorld } from './utils/hexUtils';

type Screen = 'menu' | 'worldSetup' | 'loading' | 'game' | 'about' | 'options';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_SETTINGS);
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [showDebug, setShowDebug] = useState(false);
  const [showHelpHint, setShowHelpHint] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [language, setLanguage] = useState<Language>(DEFAULT_SETTINGS.language);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
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

      // Размещаем игрока на правильной высоте после создания игры
      // Используем setTimeout с несколькими попытками, чтобы дать миру время инициализироваться
      let placementAttempts = 0;
      const tryPlacePlayer = () => {
        if (gameRef.current && placementAttempts < 20) {
          const spawnHeight = gameRef.current.getSpawnHeight(0, 0);
          
          if (spawnHeight !== null || placementAttempts >= 19) {
            const spawnPos = hexToWorld(0, 0, 0);
            const finalY = spawnHeight !== null ? spawnHeight + 1.7 : 10;
            
            gameRef.current.setPlayerPosition(spawnPos.x, finalY, spawnPos.z);
          } else {
            placementAttempts++;
            setTimeout(tryPlacePlayer, 100);
          }
        }
      };
      
      setTimeout(tryPlacePlayer, 300);

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

  const handleWorldSetupStart = async (worldSetup: WorldSetup) => {
    // Объединяем настройки мира с текущими настройками игры
    const mergedSettings: GameSettings = {
      ...settingsRef.current,
      renderingMode: worldSetup.renderingMode,
      seed: worldSetup.seed
    };
    settingsRef.current = mergedSettings;
    setSettings(mergedSettings);
    
    // Переключаемся на экран загрузки
    setCurrentScreen('loading');
    setLoadingProgress(0);
    setLoadingStatus('Инициализация мира...');

    // Создаем временную сцену для генерации первого чанка
    const tempScene = new THREE.Scene();
    const tempWorld = new World(tempScene, mergedSettings);
    
    setLoadingProgress(20);
    setLoadingStatus('Генерация первого биома...');

    // Генерируем ТОЛЬКО первый чанк (0, 0)
    tempWorld.initialize();
    
    // Ждем, чтобы чанк успел полностью загрузиться и сгенерироваться
    // КРИТИЧНО: Ждем завершения генерации перед размещением игрока
    let attempts = 0;
    let spawnHeight: number | null = null;
    const maxAttempts = 100; // Увеличиваем лимит для надежности
    while (attempts < maxAttempts && spawnHeight === null) {
      await new Promise(resolve => setTimeout(resolve, 50)); // Yield к браузеру каждые 50ms
      spawnHeight = tempWorld.getHighestBlockAt(0, 0);
      attempts++;
      
      setLoadingProgress(20 + Math.min(40, Math.floor(attempts * 40 / maxAttempts)));
      setLoadingStatus(`Генерация первого биома... (${attempts}/${maxAttempts})`);
    }
    
    // Если чанк не загрузился, используем высоту по умолчанию
    if (spawnHeight === null && attempts >= maxAttempts) {
      console.warn('[App] Чанк (0,0) не загрузился за отведенное время, используем высоту по умолчанию');
    }
    
    setLoadingProgress(60);
    setLoadingStatus('Поиск точки спавна...');

    // Находим самую высокую точку в координатах q:0, r:0
    if (spawnHeight === null) {
      // Если не нашли блок, используем высоту по умолчанию
      setLoadingProgress(80);
      setLoadingStatus('Использование точки спавна по умолчанию...');
    } else {
      setLoadingProgress(80);
      setLoadingStatus('Размещение игрока...');
    }

    setLoadingProgress(90);
    setLoadingStatus('Запуск игры...');

    // Очищаем временную сцену
    tempScene.clear();

    // Небольшая задержка для плавности
    await new Promise(resolve => setTimeout(resolve, 300));

    setLoadingProgress(100);
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

      {currentScreen === 'loading' && (
        <LoadingScreen progress={loadingProgress} status={loadingStatus} />
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
