import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from './game/Game';
import { InventorySlot } from './types/game';
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
    generationStatus: 'chunks:0 meshes:0 rd:0 cs:0/0',
    playerState: {
      name: 'Player',
      inventory: [],
      hotbar: []
    }
  });

  const [inventoryOpen, setInventoryOpen] = useState(false);

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

      // Размещаем игрока на правильной высоте после создания игры
      // Используем сохраненную позицию спавна из handleWorldSetupStart
      const spawnPos = (window as any).__spawnPosition;
      if (spawnPos) {
        // Yield к браузеру перед размещением игрока
        requestAnimationFrame(() => {
          if (gameRef.current) {
            gameRef.current.setPlayerPosition(spawnPos.x, spawnPos.y, spawnPos.z);
          }
          // Очищаем временную переменную
          delete (window as any).__spawnPosition;
        });
      } else {
        // Fallback: используем старый метод если позиция не была сохранена
        const spawnPos = hexToWorld(0, 0, 0);
        gameRef.current.setPlayerPosition(spawnPos.x, 10, spawnPos.z);
      }

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

    setLoadingProgress(85);
    setLoadingStatus('Размещение игрока...');

    // 6. Вычисляем позицию спавна игрока
    const spawnPos = hexToWorld(0, 0, 0);
    const finalY = spawnHeight + 1.7; // Добавляем высоту игрока

    // 7. Очищаем временную сцену
    tempScene.clear();

    // 8. Yield к браузеру перед переключением экрана
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    setLoadingProgress(100);
    setLoadingStatus('Запуск игры...');

    // 9. Переключаемся на игровой экран
    setShowHelpHint(true);
    setCurrentScreen('game');
    
    // Сохраняем позицию спавна для использования в useEffect
    (window as any).__spawnPosition = { x: spawnPos.x, y: finalY, z: spawnPos.z };
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
            playerState={gameState.playerState}
            inventoryOpen={inventoryOpen}
            onInventoryToggle={handleInventoryToggle}
            onInventoryChange={handleInventoryChange}
            onHotbarChange={handleHotbarChange}
          />
        </>
      )}
      </div>
    </LanguageProvider>
  );
}

export default App;
