import { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Game, GameState } from './game/Game';
import { InventorySlot, EquipmentSlot } from './types/game';
import { GameSettings, DEFAULT_SETTINGS, WorldSetup, RenderingMode } from './types/settings';
import { LanguageProvider } from './contexts/LanguageContext';
import { Language } from './utils/i18n';
import { World } from './game/World';
import * as THREE from 'three';
import { hexToWorld } from './utils/hexUtils';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load heavy components
const GameUI = lazy(() => import('./components/GameUI').then(module => ({ default: module.GameUI })));
const MainMenu = lazy(() => import('./components/MainMenu').then(module => ({ default: module.MainMenu })));
const AboutPage = lazy(() => import('./components/AboutPage').then(module => ({ default: module.AboutPage })));
const OptionsPage = lazy(() => import('./components/OptionsPage').then(module => ({ default: module.OptionsPage })));
const WorldSetupMenu = lazy(() => import('./components/WorldSetupMenu').then(module => ({ default: module.WorldSetupMenu })));
const LoadingScreen = lazy(() => import('./components/LoadingScreen').then(module => ({ default: module.LoadingScreen })));

type Screen = 'menu' | 'worldSetup' | 'loading' | 'game' | 'about' | 'options';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Error handler for main app
  const handleAppError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('App Error:', error, errorInfo);

    // In production, send to error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  };
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
    targetBiome: null,
    showFogBarrier: true,
    currentTime: '06:00',
    health: 100,
    stamina: 100,
    hunger: 100,
    generationCode: 'seed-0',
    generationStatus: 'chunks:0 meshes:0 rd:0 cs:0/0',
    playerState: {
      name: 'Player',
      inventory: [],
      hotbar: [],
      equipment: []
    },
    droppedItems: []
  });

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [spawnPosition, setSpawnPosition] = useState<{x: number, y: number, z: number} | null>(null);

  // Обработчики инвентаря
  const handleInventoryChange = (inventory: InventorySlot[]) => {
    setGameState(prev => ({
      ...prev,
      playerState: {
        ...prev.playerState,
        inventory
      }
    }));
    gameRef.current?.updateInventory(inventory);
  };

  const handleHotbarChange = (hotbar: InventorySlot[]) => {
    setGameState(prev => ({
      ...prev,
      playerState: {
        ...prev.playerState,
        hotbar
      }
    }));
    gameRef.current?.updateHotbar(hotbar);
  };

  const handleEquipmentChange = (equipment: EquipmentSlot[]) => {
    setGameState(prev => ({
      ...prev,
      playerState: {
        ...prev.playerState,
        equipment
      }
    }));
    gameRef.current?.updateEquipment(equipment);
  };

  // Обработчик открытия/закрытия инвентаря
  const handleInventoryToggle = () => {
    const newInventoryOpen = !inventoryOpen;
    setInventoryOpen(newInventoryOpen);

    // Освобождаем/захватываем курсор
    if (newInventoryOpen) {
      // Освобождаем курсор для работы с инвентарем
      document.exitPointerLock();
    } else {
      // Захватываем курсор обратно для игры
      canvasRef.current?.requestPointerLock();
    }
  };

  useEffect(() => {
    settingsRef.current = settings;
    setLanguage(settings.language);
  }, [settings]);

  useEffect(() => {
    if (currentScreen === 'game' && canvasRef.current && !gameRef.current) {
      gameRef.current = new Game(canvasRef.current, (state) => {
        setGameState(state);
      }, settingsRef.current);

      // Размещаем игрока на рассчитанной высоте спавна или по умолчанию
      if (spawnPosition) {
        gameRef.current.setPlayerPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);
      } else {
        // Fallback на фиксированную позицию, если спавн не рассчитан
        const spawnPos = hexToWorld(0, 0, 0);
        gameRef.current.setPlayerPosition(spawnPos.x, 10, spawnPos.z);
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Backquote') {
          e.preventDefault();
          setShowDebug(prev => !prev);
        }
        if (e.key === 'F2') {
          e.preventDefault();
          const currentSettings = settingsRef.current;
          const newMode: RenderingMode = currentSettings.renderingMode === 'prototype' ? 'modern' : 'prototype';
          console.log('Switching rendering mode to:', newMode);

          // Обновляем настройки
          const updatedSettings = { ...currentSettings, renderingMode: newMode };
          settingsRef.current = updatedSettings;
          setSettings(updatedSettings);

          if (gameRef.current) {
            gameRef.current.setRenderingMode(newMode);
            console.log('Rendering mode switched successfully');
          } else {
            console.log('Game ref not available');
          }
        }
        if (e.key === 'F') {
          e.preventDefault();
          // Toggle fog barrier
          gameRef.current?.toggleFogBarrier();
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
  }, [currentScreen, spawnPosition]);

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
    
    // КОНТРАКТ СТАРТА (NON-NEGOTIABLE):
    // 1. Показать экран загрузки
    setCurrentScreen('loading');
    setLoadingProgress(0);
    setLoadingStatus('Инициализация мира...');

    // 2. await первый кадр анимации
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    setLoadingProgress(20);
    setLoadingStatus('Создание мира...');

    // 3. Создаем временную сцену для генерации первого чанка
    const tempScene = new THREE.Scene();
    const tempWorld = new World(tempScene, mergedSettings);
    tempWorld.initialize();
    
    setLoadingProgress(40);
    setLoadingStatus('Генерация первого чанка...');

    // 4. Генерируем чанк (0,0) полностью
    await tempWorld.initializeAsync();
    
    setLoadingProgress(70);
    setLoadingStatus('Поиск точки спавна...');

    // 5. Находим высоту спавна
    let spawnHeight: number | null = tempWorld.getHighestBlockAt(0, 0);

    if (spawnHeight === null) {
      console.warn('[App] Чанк (0,0) не содержит блоков, используем высоту по умолчанию');
      spawnHeight = 10; // Высота по умолчанию
    }

    // Сохраняем позицию спавна для использования при инициализации игры
    const finalHeight = spawnHeight !== null ? spawnHeight + 1.7 : 11.7; // Высота игрока + отступ
    const spawnPos = hexToWorld(0, 0, 0);
    setSpawnPosition({ x: spawnPos.x, y: finalHeight, z: spawnPos.z });

    setLoadingProgress(85);
    setLoadingStatus('Размещение игрока...');

    // Очищаем временную сцену
    tempScene.clear();

    // Yield к браузеру перед переключением экрана
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    setLoadingProgress(100);
    setLoadingStatus('Запуск игры...');

    // Переключаемся на игровой экран
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
    <ErrorBoundary onError={handleAppError}>
      <LanguageProvider language={language} setLanguage={(lang) => {
        setLanguage(lang);
        setSettings({ ...settings, language: lang });
      }}>
      <div className="relative w-full h-screen overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center w-full h-full bg-black">
            <div className="text-white text-xl">Loading...</div>
          </div>
        }>
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
            targetBiome={gameState.targetBiome}
            showFogBarrier={gameState.showFogBarrier}
            currentTime={gameState.currentTime}
            showHelpHint={showHelpHint}
            health={gameState.health}
            stamina={gameState.stamina}
            hunger={gameState.hunger}
            generationCode={gameState.generationCode}
            generationStatus={gameState.generationStatus}
            playerState={gameState.playerState}
            inventoryOpen={inventoryOpen}
            onInventoryToggle={handleInventoryToggle}
            onInventoryChange={handleInventoryChange}
            onHotbarChange={handleHotbarChange}
            onEquipmentChange={handleEquipmentChange}
          />
        </>
      )}
        </Suspense>
      </div>
    </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
