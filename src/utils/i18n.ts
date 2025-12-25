export type Language = 'ru' | 'en' | 'es' | 'de' | 'zh' | 'ko' | 'ja';

export interface Translations {
  // Main Menu
  mainMenu: {
    newGame: string;
    loadGame: string;
    coop: string;
    options: string;
    about: string;
  };
  
  // World Setup Menu
  worldSetup: {
    title: string;
    playerName: string;
    playerNamePlaceholder: string;
    gameMode: string;
    gameModeSolo: string;
    gameModeCoop: string;
    gameModeOnline: string;
    gameModeSoloDesc: string;
    gameModeCoopDesc: string;
    gameModeOnlineDesc: string;
    blockRenderMode: string;
    renderingModePrototype: string;
    renderingModeModern: string;
    renderingModeDesc: string;
    worldSeed: string;
    worldSeedPlaceholder: string;
    worldSeedDesc: string;
    startGame: string;
    back: string;
  };
  
  // Options Page
  options: {
    title: string;
    language: string;
    renderDistance: string;
    renderDistanceDesc: string;
    fogDensity: string;
    fogDensityDesc: string;
    biomeSize: string;
    biomeSizeDesc: string;
    chunkSize: string;
    chunkSizeDesc: string;
    maxLoadedChunks: string;
    maxLoadedChunksDesc: string;
    renderingMode: string;
    renderingModeDesc: string;
    saveSettings: string;
    reset: string;
    back: string;
  };
  
  // About Page
  about: {
    title: string;
    description1: string;
    description2: string;
    description3: string;
    description4: string;
    description5: string;
    developmentTeam: string;
    createdBy: string;
    technologyStack: string;
    tech1: string;
    tech2: string;
    tech3: string;
    tech4: string;
    backToMenu: string;
  };
  
  // Game UI
  gameUI: {
    helpHint: string;
    debug: string;
    move: string;
    toggleFlyWalk: string;
    jumpWalk: string;
    downFly: string;
    breakBlock: string;
    placeBlock: string;
    pickupItems: string;
    selectBlock: string;
    inventory: string;
    toggleRenderingMode: string;
    toggleDebug: string;
    toggleFogBarrier: string;
    closeMenu: string;
    time: string;
    generationCode: string;
    generationStatus: string;
    mode: string;
    fly: string;
    walk: string;
    fogOn: string;
    fogOff: string;
    block: string;
    biome: string;
  };

  // Inventory
  inventory: {
    helmet: string;
    chestplate: string;
    leggings: string;
    boots: string;
    cape: string;
    head: string;
    chest: string;
    legs: string;
    cape_vanity: string;
    amulet: string;
    ring1: string;
    ring2: string;
    artifact1: string;
    artifact2: string;
    stoneBlock: string;
    woodBlock: string;
    bronzeOre: string;
    grassBlock: string;
    dirtBlock: string;
    sandBlock: string;
    leavesBlock: string;
    snowBlock: string;
    iceBlock: string;
    lavaBlock: string;
    playersOnline: string;
  };
}

const translations: Record<Language, Translations> = {
  ru: {
    mainMenu: {
      newGame: 'Новая игра',
      loadGame: 'Загрузить игру',
      coop: 'Вылазки',
      options: 'Настройки',
      about: 'О игре'
    },
    worldSetup: {
      title: 'Настройка мира',
      playerName: 'Имя игрока',
      playerNamePlaceholder: 'Введите ваше имя',
      gameMode: 'Режим игры',
      gameModeSolo: 'Одиночный',
      gameModeCoop: 'Кооператив',
      gameModeOnline: 'Онлайн',
      gameModeSoloDesc: 'Одиночный режим',
      gameModeCoopDesc: 'Кооперативный режим (скоро)',
      gameModeOnlineDesc: 'Онлайн режим (скоро)',
      blockRenderMode: 'Режим рендеринга блоков',
      renderingModePrototype: 'Prototype (цвета)',
      renderingModeModern: 'Modern (атлас)',
      renderingModeDesc: 'Prototype — цвета; Modern — текстуры из общего атласа',
      worldSeed: 'Seed мира',
      worldSeedPlaceholder: 'Случайный seed',
      worldSeedDesc: 'Числовой seed для детерминированной генерации мира',
      startGame: 'Начать игру',
      back: 'Назад'
    },
    options: {
      title: 'Настройки',
      language: 'Язык',
      renderDistance: 'Дистанция рендеринга',
      renderDistanceDesc: 'Количество загруженных чанков вокруг игрока (1-7)',
      fogDensity: 'Плотность тумана',
      fogDensityDesc: 'Насколько густой туман (0.1-2.0)',
      biomeSize: 'Размер биома',
      biomeSizeDesc: 'Масштаб регионов биомов (0.5-2.0)',
      chunkSize: 'Размер чанка',
      chunkSizeDesc: 'Гексагонов на чанк (8-20)',
      maxLoadedChunks: 'Макс. загруженных чанков',
      maxLoadedChunksDesc: 'Максимум чанков в памяти (5-30)',
      renderingMode: 'Режим рендеринга',
      renderingModeDesc: 'Prototype — цвета; Modern — текстуры из общего атласа',
      saveSettings: 'Сохранить настройки',
      reset: 'Сбросить',
      back: 'Назад'
    },
    about: {
      title: 'О Hexcraft',
      description1: 'Hexcraft — это воксельная песочница, которая переосмысливает классический опыт строительства блоков с уникальной гексагональной сеткой. В отличие от традиционных кубических миров, Hexcraft предлагает свежий взгляд на генерацию ландшафта и механику строительства.',
      description2: 'Игра включает процедурно сгенерированные миры с разнообразными биомами, каждый со своими отличительными характеристиками. От пышных равнин и густых лесов до засушливых пустынь и замерзших тундр, каждый регион предлагает уникальные строительные материалы и экологические вызовы.',
      description3: 'Игроки могут плавно переключаться между режимами полета и ходьбы, позволяя как быстрое исследование, так и приземленный геймплей выживания. Динамическая система загрузки чанков обеспечивает плавную производительность при сохранении обширного, исследуемого мира.',
      description4: 'Построенный на современных веб-технологиях, Hexcraft раздвигает границы того, что возможно в браузерных 3D играх. Интуитивное управление и знакомые механики делают его доступным для новичков, предлагая глубину для опытных строителей.',
      description5: 'Эта прототипная версия демонстрирует основные механики и служит основой для будущих функций, включая многопользовательское сотрудничество, продвинутые системы крафта и улучшенные взаимодействия с миром.',
      developmentTeam: 'Команда разработки',
      createdBy: 'Создано с любовью С4m1r (c4m1r.github.io).',
      technologyStack: 'Технологический стек',
      tech1: 'Three.js для 3D рендеринга и графики',
      tech2: 'React для UI компонентов и управления состоянием',
      tech3: 'TypeScript для типобезопасной разработки',
      tech4: 'Алгоритмы процедурной генерации для бесконечных миров',
      backToMenu: 'Вернуться в меню'
    },
    gameUI: {
      helpHint: 'Нажмите ` для отладки',
      debug: 'Отладка',
      move: 'WASD - Движение',
      toggleFlyWalk: 'Space (2x) - Переключить Полёт/Ходьбу',
      jumpWalk: 'Space - Прыжок (Ходьба) / Вверх (Полёт)',
      downFly: 'Shift - Вниз (Полёт)',
      breakBlock: 'ЛКМ - Разрушить блок',
      placeBlock: 'ПКМ - Поставить блок',
      pickupItems: 'E - Подобрать предметы',
      selectBlock: '1-9,0 - Выбрать блок',
      inventory: 'TAB - Инвентарь',
      toggleRenderingMode: 'F2 - Переключить режим рендеринга',
      toggleDebug: '~ - Переключить отладку',
      toggleFogBarrier: 'F - Переключить туман',
      closeMenu: 'ESC - Меню',
      time: 'ВРЕМЯ',
      generationCode: 'Код генерации',
      generationStatus: 'Статус генерации',
      mode: 'Режим',
      fly: 'ПОЛЁТ',
      walk: 'ХОДЬБА',
      fogOn: 'ВКЛ',
      fogOff: 'ВЫКЛ',
      block: 'Блок',
      biome: 'Биом'
    },
    inventory: {
      helmet: 'Шлем',
      chestplate: 'Нагрудник',
      leggings: 'Поножи',
      boots: 'Ботинки',
      cape: 'Плащ',
      head: 'Голова',
      chest: 'Туловище',
      legs: 'Ноги',
      cape_vanity: 'Плащ (косметика)',
      amulet: 'Амулет',
      ring1: 'Кольцо 1',
      ring2: 'Кольцо 2',
      artifact1: 'Артефакт 1',
      artifact2: 'Артефакт 2',
      stoneBlock: 'Каменный блок',
      woodBlock: 'Деревянный блок',
      bronzeOre: 'Бронзовая руда',
      grassBlock: 'Блок травы',
      dirtBlock: 'Блок земли',
      sandBlock: 'Блок песка',
      leavesBlock: 'Блок листьев',
      snowBlock: 'Блок снега',
      iceBlock: 'Блок льда',
      lavaBlock: 'Блок лавы',
      playersOnline: 'Игроки онлайн'
    }
  },
  en: {
    mainMenu: {
      newGame: 'New Game',
      loadGame: 'Load Game',
      coop: 'Incursions',
      options: 'Options',
      about: 'About'
    },
    worldSetup: {
      title: 'World Setup',
      playerName: 'Player Name',
      playerNamePlaceholder: 'Enter your name',
      gameMode: 'Game Mode',
      gameModeSolo: 'Solo',
      gameModeCoop: 'Co-op',
      gameModeOnline: 'Online',
      gameModeSoloDesc: 'Single player mode',
      gameModeCoopDesc: 'Co-op mode (coming soon)',
      gameModeOnlineDesc: 'Online mode (coming soon)',
      blockRenderMode: 'Block Render Mode',
      renderingModePrototype: 'Prototype (colors)',
      renderingModeModern: 'Modern (atlas)',
      renderingModeDesc: 'Prototype — colors; Modern — textures from atlas',
      worldSeed: 'World Seed',
      worldSeedPlaceholder: 'Random seed',
      worldSeedDesc: 'Numeric seed for deterministic world generation',
      startGame: 'Start Game',
      back: 'Back'
    },
    options: {
      title: 'Settings',
      language: 'Language',
      renderDistance: 'Render Distance',
      renderDistanceDesc: 'Number of chunks loaded around the player (1-7)',
      fogDensity: 'Fog Density',
      fogDensityDesc: 'How thick the fog is (0.1-2.0)',
      biomeSize: 'Biome Size',
      biomeSizeDesc: 'Scale of biome regions (0.5-2.0)',
      chunkSize: 'Chunk Size',
      chunkSizeDesc: 'Hexagons per chunk (8-20)',
      maxLoadedChunks: 'Max Loaded Chunks',
      maxLoadedChunksDesc: 'Maximum chunks in memory (5-30)',
      renderingMode: 'Rendering Mode',
      renderingModeDesc: 'Prototype — colors; Modern — textures from atlas',
      saveSettings: 'Save Settings',
      reset: 'Reset',
      back: 'Back'
    },
    about: {
      title: 'About Hexcraft',
      description1: 'Hexcraft is an voxel-based sandbox game that reimagines the classic block-building experience with a unique hexagonal grid system. Unlike traditional cubic worlds, Hexcraft offers a fresh perspective on terrain generation and construction mechanics.',
      description2: 'The game features procedurally generated worlds with diverse biomes, each with their own distinct characteristics. From lush plains and dense forests to arid deserts and frozen tundras, every region offers unique building materials and environmental challenges.',
      description3: 'Players can seamlessly switch between flight and walking modes, allowing for both rapid exploration and grounded survival gameplay. The dynamic chunk loading system ensures smooth performance while maintaining an expansive, explorable world.',
      description4: 'Built with modern web technologies, Hexcraft pushes the boundaries of what\'s possible in browser-based 3D gaming. The intuitive controls and familiar mechanics make it accessible to newcomers while offering depth for experienced builders.',
      description5: 'This prototype version showcases the core mechanics and serves as a foundation for future features including multiplayer cooperation, advanced crafting systems, and enhanced world interactions.',
      developmentTeam: 'Development Team',
      createdBy: 'Created with passion by С4m1r (c4m1r.github.io).',
      technologyStack: 'Technology Stack',
      tech1: 'Three.js for 3D rendering and graphics',
      tech2: 'React for UI components and state management',
      tech3: 'TypeScript for type-safe development',
      tech4: 'Procedural generation algorithms for infinite worlds',
      backToMenu: 'Back to Menu'
    },
    gameUI: {
      helpHint: 'Press ` for debug',
      debug: 'Debug',
      move: 'WASD - Move',
      toggleFlyWalk: 'Space (2x) - Toggle Fly/Walk',
      jumpWalk: 'Space - Jump (Walk) / Up (Fly)',
      downFly: 'Shift - Down (Fly)',
      breakBlock: 'Left Click - Break Block',
      placeBlock: 'Right Click - Place Block',
      pickupItems: 'E - Pickup Items',
      selectBlock: '1-9,0 - Select Block',
      inventory: 'TAB - Inventory',
      toggleRenderingMode: 'F2 - Toggle Rendering Mode',
      toggleDebug: '~ - Toggle Debug',
      toggleFogBarrier: 'F - Toggle Fog Barrier',
      closeMenu: 'ESC - Menu',
      time: 'TIME',
      generationCode: 'Generation code',
      generationStatus: 'Generation status',
      mode: 'Mode',
      fly: 'FLY',
      walk: 'WALK',
      fogOn: 'ON',
      fogOff: 'OFF',
      block: 'Block',
      biome: 'Biome'
    },
    inventory: {
      helmet: 'Helmet',
      chestplate: 'Chestplate',
      leggings: 'Leggings',
      boots: 'Boots',
      cape: 'Cape',
      head: 'Head',
      chest: 'Chest',
      legs: 'Legs',
      cape_vanity: 'Cape (Vanity)',
      amulet: 'Amulet',
      ring1: 'Ring 1',
      ring2: 'Ring 2',
      artifact1: 'Artifact 1',
      artifact2: 'Artifact 2',
      stoneBlock: 'Stone Block',
      woodBlock: 'Wood Block',
      bronzeOre: 'Bronze Ore',
      grassBlock: 'Grass Block',
      dirtBlock: 'Dirt Block',
      sandBlock: 'Sand Block',
      leavesBlock: 'Leaves Block',
      snowBlock: 'Snow Block',
      iceBlock: 'Ice Block',
      lavaBlock: 'Lava Block',
      playersOnline: 'Players Online'
    }
  },
  es: {
    mainMenu: {
      newGame: 'Nuevo Juego',
      loadGame: 'Cargar Juego',
      coop: 'Incursiones',
      options: 'Opciones',
      about: 'Acerca de'
    },
    worldSetup: {
      title: 'Configuración del Mundo',
      playerName: 'Nombre del Jugador',
      playerNamePlaceholder: 'Ingresa tu nombre',
      gameMode: 'Modo de Juego',
      gameModeSolo: 'Solo',
      gameModeCoop: 'Cooperativo',
      gameModeOnline: 'En Línea',
      gameModeSoloDesc: 'Modo un jugador',
      gameModeCoopDesc: 'Modo cooperativo (próximamente)',
      gameModeOnlineDesc: 'Modo en línea (próximamente)',
      blockRenderMode: 'Modo de Renderizado',
      renderingModePrototype: 'Prototipo (colores)',
      renderingModeModern: 'Moderno (atlas)',
      renderingModeDesc: 'Prototipo — colores; Moderno — texturas del atlas',
      worldSeed: 'Semilla del Mundo',
      worldSeedPlaceholder: 'Semilla aleatoria',
      worldSeedDesc: 'Semilla numérica para generación determinista del mundo',
      startGame: 'Iniciar Juego',
      back: 'Atrás'
    },
    options: {
      title: 'Configuración',
      language: 'Idioma',
      renderDistance: 'Distancia de Renderizado',
      renderDistanceDesc: 'Número de chunks cargados alrededor del jugador (1-7)',
      fogDensity: 'Densidad de Niebla',
      fogDensityDesc: 'Qué tan espesa es la niebla (0.1-2.0)',
      biomeSize: 'Tamaño del Bioma',
      biomeSizeDesc: 'Escala de las regiones del bioma (0.5-2.0)',
      chunkSize: 'Tamaño del Chunk',
      chunkSizeDesc: 'Hexágonos por chunk (8-20)',
      maxLoadedChunks: 'Chunks Máximos Cargados',
      maxLoadedChunksDesc: 'Máximo de chunks en memoria (5-30)',
      renderingMode: 'Modo de Renderizado',
      renderingModeDesc: 'Prototipo — colores; Moderno — texturas del atlas',
      saveSettings: 'Guardar Configuración',
      reset: 'Restablecer',
      back: 'Atrás'
    },
    about: {
      title: 'Acerca de Hexcraft',
      description1: 'Hexcraft es un juego sandbox basado en voxeles que reimagina la experiencia clásica de construcción de bloques con un sistema único de cuadrícula hexagonal. A diferencia de los mundos cúbicos tradicionales, Hexcraft ofrece una perspectiva fresca sobre la generación de terreno y la mecánica de construcción.',
      description2: 'El juego presenta mundos generados proceduralmente con diversos biomas, cada uno con sus propias características distintivas. Desde llanuras exuberantes y bosques densos hasta desiertos áridos y tundras congeladas, cada región ofrece materiales de construcción únicos y desafíos ambientales.',
      description3: 'Los jugadores pueden cambiar sin problemas entre modos de vuelo y caminata, permitiendo tanto una exploración rápida como un juego de supervivencia con los pies en la tierra. El sistema dinámico de carga de chunks asegura un rendimiento fluido mientras mantiene un mundo expansivo y explorable.',
      description4: 'Construido con tecnologías web modernas, Hexcraft empuja los límites de lo que es posible en los juegos 3D basados en navegador. Los controles intuitivos y las mecánicas familiares lo hacen accesible para los recién llegados mientras ofrecen profundidad para constructores experimentados.',
      description5: 'Esta versión prototipo muestra las mecánicas principales y sirve como base para futuras características, incluyendo cooperación multijugador, sistemas de creación avanzados e interacciones mejoradas con el mundo.',
      developmentTeam: 'Equipo de Desarrollo',
      createdBy: 'Creado con pasión por С4m1r (c4m1r.github.io).',
      technologyStack: 'Stack Tecnológico',
      tech1: 'Three.js para renderizado 3D y gráficos',
      tech2: 'React para componentes UI y gestión de estado',
      tech3: 'TypeScript para desarrollo seguro de tipos',
      tech4: 'Algoritmos de generación procedural para mundos infinitos',
      backToMenu: 'Volver al Menú'
    },
    gameUI: {
      helpHint: 'Presiona ` para depuración',
      debug: 'Depuración',
      move: 'WASD - Moverse',
      toggleFlyWalk: 'Espacio (2x) - Alternar Vuelo/Caminar',
      jumpWalk: 'Espacio - Saltar (Caminar) / Arriba (Vuelo)',
      downFly: 'Shift - Abajo (Vuelo)',
      breakBlock: 'Clic Izquierdo - Romper Bloque',
      placeBlock: 'Clic Derecho - Colocar Bloque',
      pickupItems: 'E - Recoger Objetos',
      selectBlock: '1-9,0 - Seleccionar Bloque',
      inventory: 'TAB - Inventario',
      toggleRenderingMode: 'F2 - Alternar Modo de Renderizado',
      toggleDebug: '~ - Alternar Depuración',
      toggleFogBarrier: 'F - Alternar Barrera de Niebla',
      closeMenu: 'ESC - Menú',
      time: 'TIEMPO',
      generationCode: 'Código de generación',
      generationStatus: 'Estado de generación',
      mode: 'Modo',
      fly: 'VUELO',
      walk: 'CAMINAR',
      fogOn: 'ENC',
      fogOff: 'APAG',
      block: 'Bloque',
      biome: 'Bioma'
    },
    inventory: {
      helmet: 'Casco',
      chestplate: 'Peto',
      leggings: 'Grebas',
      boots: 'Botas',
      cape: 'Capa',
      head: 'Cabeza',
      chest: 'Torso',
      legs: 'Piernas',
      cape_vanity: 'Capa (Vanidad)',
      amulet: 'Amuleto',
      ring1: 'Anillo 1',
      ring2: 'Anillo 2',
      artifact1: 'Artefacto 1',
      artifact2: 'Artefacto 2',
      stoneBlock: 'Bloque de Piedra',
      woodBlock: 'Bloque de Madera',
      bronzeOre: 'Mineral de Bronce',
      grassBlock: 'Bloque de Hierba',
      dirtBlock: 'Bloque de Tierra',
      sandBlock: 'Bloque de Arena',
      leavesBlock: 'Bloque de Hojas',
      snowBlock: 'Bloque de Nieve',
      iceBlock: 'Bloque de Hielo',
      lavaBlock: 'Bloque de Lava',
      playersOnline: 'Jugadores en Línea'
    }
  },
  de: {
    mainMenu: {
      newGame: 'Neues Spiel',
      loadGame: 'Spiel Laden',
      coop: 'Einfälle',
      options: 'Einstellungen',
      about: 'Über'
    },
    worldSetup: {
      title: 'Welt-Einstellungen',
      playerName: 'Spielername',
      playerNamePlaceholder: 'Gib deinen Namen ein',
      gameMode: 'Spielmodus',
      gameModeSolo: 'Solo',
      gameModeCoop: 'Kooperativ',
      gameModeOnline: 'Online',
      gameModeSoloDesc: 'Einzelspielermodus',
      gameModeCoopDesc: 'Kooperativer Modus (demnächst)',
      gameModeOnlineDesc: 'Online-Modus (demnächst)',
      blockRenderMode: 'Block-Render-Modus',
      renderingModePrototype: 'Prototyp (Farben)',
      renderingModeModern: 'Modern (Atlas)',
      renderingModeDesc: 'Prototyp — Farben; Modern — Texturen aus Atlas',
      worldSeed: 'Welt-Seed',
      worldSeedPlaceholder: 'Zufälliger Seed',
      worldSeedDesc: 'Numerischer Seed für deterministische Weltgenerierung',
      startGame: 'Spiel Starten',
      back: 'Zurück'
    },
    options: {
      title: 'Einstellungen',
      language: 'Sprache',
      renderDistance: 'Render-Distanz',
      renderDistanceDesc: 'Anzahl der geladenen Chunks um den Spieler (1-7)',
      fogDensity: 'Nebeldichte',
      fogDensityDesc: 'Wie dick der Nebel ist (0.1-2.0)',
      biomeSize: 'Biom-Größe',
      biomeSizeDesc: 'Skala der Biom-Regionen (0.5-2.0)',
      chunkSize: 'Chunk-Größe',
      chunkSizeDesc: 'Hexagone pro Chunk (8-20)',
      maxLoadedChunks: 'Max. Geladene Chunks',
      maxLoadedChunksDesc: 'Maximale Chunks im Speicher (5-30)',
      renderingMode: 'Render-Modus',
      renderingModeDesc: 'Prototyp — Farben; Modern — Texturen aus Atlas',
      saveSettings: 'Einstellungen Speichern',
      reset: 'Zurücksetzen',
      back: 'Zurück'
    },
    about: {
      title: 'Über Hexcraft',
      description1: 'Hexcraft ist ein Voxel-basiertes Sandbox-Spiel, das die klassische Blockbau-Erfahrung mit einem einzigartigen hexagonalen Rastersystem neu interpretiert. Im Gegensatz zu traditionellen kubischen Welten bietet Hexcraft eine frische Perspektive auf Terrain-Generierung und Bau-Mechaniken.',
      description2: 'Das Spiel verfügt über prozedural generierte Welten mit vielfältigen Biomen, jedes mit seinen eigenen charakteristischen Eigenschaften. Von üppigen Ebenen und dichten Wäldern bis hin zu trockenen Wüsten und gefrorenen Tundren bietet jede Region einzigartige Baumaterialien und Umweltherausforderungen.',
      description3: 'Spieler können nahtlos zwischen Flug- und Gehmodi wechseln, was sowohl schnelle Erkundung als auch erdgebundenes Survival-Gameplay ermöglicht. Das dynamische Chunk-Ladesystem sorgt für reibungslose Leistung bei gleichzeitiger Aufrechterhaltung einer expansiven, erkundbaren Welt.',
      description4: 'Gebaut mit modernen Web-Technologien, erweitert Hexcraft die Grenzen dessen, was in browserbasierten 3D-Spielen möglich ist. Die intuitiven Steuerungen und vertrauten Mechaniken machen es für Neulinge zugänglich und bieten gleichzeitig Tiefe für erfahrene Baumeister.',
      description5: 'Diese Prototyp-Version zeigt die Kernmechaniken und dient als Grundlage für zukünftige Funktionen, einschließlich Multiplayer-Kooperation, fortgeschrittene Crafting-Systeme und verbesserte Weltinteraktionen.',
      developmentTeam: 'Entwicklungsteam',
      createdBy: 'Mit Leidenschaft erstellt von С4m1r (c4m1r.github.io).',
      technologyStack: 'Technologie-Stack',
      tech1: 'Three.js für 3D-Rendering und Grafik',
      tech2: 'React für UI-Komponenten und State-Management',
      tech3: 'TypeScript für typsichere Entwicklung',
      tech4: 'Prozedurale Generierungsalgorithmen für unendliche Welten',
      backToMenu: 'Zurück zum Menü'
    },
    gameUI: {
      helpHint: 'Drücke ` für Debug',
      debug: 'Debug',
      move: 'WASD - Bewegen',
      toggleFlyWalk: 'Leertaste (2x) - Flug/Laufen umschalten',
      jumpWalk: 'Leertaste - Springen (Laufen) / Hoch (Flug)',
      downFly: 'Shift - Runter (Flug)',
      breakBlock: 'Linksklick - Block zerbrechen',
      placeBlock: 'Rechtsklick - Block platzieren',
      pickupItems: 'E - Gegenstände aufheben',
      selectBlock: '1-9,0 - Block auswählen',
      inventory: 'TAB - Inventar',
      toggleRenderingMode: 'F2 - Rendering-Modus umschalten',
      toggleDebug: '~ - Debug umschalten',
      toggleFogBarrier: 'F - Nebelbarriere umschalten',
      closeMenu: 'ESC - Menü',
      time: 'ZEIT',
      generationCode: 'Generierungscode',
      generationStatus: 'Generierungsstatus',
      mode: 'Modus',
      fly: 'FLUG',
      walk: 'LAUFEN',
      fogOn: 'AN',
      fogOff: 'AUS',
      block: 'Block',
      biome: 'Biom'
    },
    inventory: {
      helmet: 'Helm',
      chestplate: 'Brustplatte',
      leggings: 'Beinschutz',
      boots: 'Stiefel',
      cape: 'Umhang',
      head: 'Kopf',
      chest: 'Brust',
      legs: 'Beine',
      cape_vanity: 'Umhang (Eitelkeit)',
      amulet: 'Amulett',
      ring1: 'Ring 1',
      ring2: 'Ring 2',
      artifact1: 'Artefakt 1',
      artifact2: 'Artefakt 2',
      stoneBlock: 'Steinblock',
      woodBlock: 'Holzblock',
      bronzeOre: 'Bronze Erz',
      grassBlock: 'Grasblock',
      dirtBlock: 'Erdblock',
      sandBlock: 'Sandblock',
      leavesBlock: 'Blätterblock',
      snowBlock: 'Schneeblock',
      iceBlock: 'Eisblock',
      lavaBlock: 'Lavablock',
      playersOnline: 'Spieler Online'
    }
  },
  zh: {
    mainMenu: {
      newGame: '新游戏',
      loadGame: '加载游戏',
      coop: '突袭',
      options: '设置',
      about: '关于'
    },
    worldSetup: {
      title: '世界设置',
      playerName: '玩家名称',
      playerNamePlaceholder: '输入您的名称',
      gameMode: '游戏模式',
      gameModeSolo: '单人',
      gameModeCoop: '合作',
      gameModeOnline: '在线',
      gameModeSoloDesc: '单人模式',
      gameModeCoopDesc: '合作模式（即将推出）',
      gameModeOnlineDesc: '在线模式（即将推出）',
      blockRenderMode: '方块渲染模式',
      renderingModePrototype: '原型（颜色）',
      renderingModeModern: '现代（图集）',
      renderingModeDesc: '原型 — 颜色；现代 — 图集纹理',
      worldSeed: '世界种子',
      worldSeedPlaceholder: '随机种子',
      worldSeedDesc: '用于确定性世界生成的数字种子',
      startGame: '开始游戏',
      back: '返回'
    },
    options: {
      title: '设置',
      language: '语言',
      renderDistance: '渲染距离',
      renderDistanceDesc: '玩家周围加载的区块数量 (1-7)',
      fogDensity: '雾密度',
      fogDensityDesc: '雾的厚度 (0.1-2.0)',
      biomeSize: '生物群系大小',
      biomeSizeDesc: '生物群系区域的比例 (0.5-2.0)',
      chunkSize: '区块大小',
      chunkSizeDesc: '每个区块的六边形数 (8-20)',
      maxLoadedChunks: '最大加载区块',
      maxLoadedChunksDesc: '内存中的最大区块数 (5-30)',
      renderingMode: '渲染模式',
      renderingModeDesc: '原型 — 颜色；现代 — 图集纹理',
      saveSettings: '保存设置',
      reset: '重置',
      back: '返回'
    },
    about: {
      title: '关于 Hexcraft',
      description1: 'Hexcraft 是一款基于体素的沙盒游戏，通过独特的六边形网格系统重新构想了经典的方块建造体验。与传统的立方体世界不同，Hexcraft 为地形生成和建造机制提供了全新的视角。',
      description2: '游戏具有程序生成的世界，包含多样化的生物群系，每个都有其独特的特征。从茂盛的平原和茂密的森林到干旱的沙漠和冰冻的苔原，每个区域都提供独特的建筑材料和环境挑战。',
      description3: '玩家可以在飞行和步行模式之间无缝切换，既可以快速探索，也可以进行地面生存游戏。动态区块加载系统确保流畅的性能，同时保持广阔的可探索世界。',
      description4: '使用现代网络技术构建，Hexcraft 突破了浏览器 3D 游戏的界限。直观的控制和熟悉的机制使其对新玩家易于上手，同时为经验丰富的建造者提供深度。',
      description5: '这个原型版本展示了核心机制，并作为未来功能的基础，包括多人合作、高级制作系统和增强的世界交互。',
      developmentTeam: '开发团队',
      createdBy: '由 С4m1r (c4m1r.github.io) 充满热情地创建。',
      technologyStack: '技术栈',
      tech1: 'Three.js 用于 3D 渲染和图形',
      tech2: 'React 用于 UI 组件和状态管理',
      tech3: 'TypeScript 用于类型安全开发',
      tech4: '程序生成算法用于无限世界',
      backToMenu: '返回菜单'
    },
    gameUI: {
      helpHint: '按 ` 进行调试',
      debug: '调试',
      move: 'WASD - 移动',
      toggleFlyWalk: '空格键 (2x) - 切换飞行/步行',
      jumpWalk: '空格键 - 跳跃 (步行) / 上升 (飞行)',
      downFly: 'Shift - 下降 (飞行)',
      breakBlock: '左键 - 破坏方块',
      placeBlock: '右键 - 放置方块',
      pickupItems: 'E - 拾取物品',
      selectBlock: '1-9,0 - 选择方块',
      inventory: 'TAB - 物品栏',
      toggleRenderingMode: 'F2 - 切换渲染模式',
      toggleDebug: '~ - 切换调试',
      toggleFogBarrier: 'F - 切换雾障',
      closeMenu: 'ESC - 菜单',
      time: '时间',
      generationCode: '生成代码',
      generationStatus: '生成状态',
      mode: '模式',
      fly: '飞行',
      walk: '步行',
      fogOn: '开',
      fogOff: '关',
      block: '方块',
      biome: '生物群系'
    },
    inventory: {
      helmet: '头盔',
      chestplate: '胸甲',
      leggings: '护腿',
      boots: '靴子',
      cape: '披风',
      head: '头部',
      chest: '胸部',
      legs: '腿部',
      cape_vanity: '披风 (虚荣)',
      amulet: '护符',
      ring1: '戒指 1',
      ring2: '戒指 2',
      artifact1: '神器 1',
      artifact2: '神器 2',
      stoneBlock: '石块',
      woodBlock: '木块',
      bronzeOre: '青铜矿石',
      grassBlock: '草块',
      dirtBlock: '泥土块',
      sandBlock: '沙块',
      leavesBlock: '树叶块',
      snowBlock: '雪块',
      iceBlock: '冰块',
      lavaBlock: '熔岩块',
      playersOnline: '在线玩家'
    }
  },
  ko: {
    mainMenu: {
      newGame: '새 게임',
      loadGame: '게임 불러오기',
      coop: '습격',
      options: '설정',
      about: '정보'
    },
    worldSetup: {
      title: '월드 설정',
      playerName: '플레이어 이름',
      playerNamePlaceholder: '이름을 입력하세요',
      gameMode: '게임 모드',
      gameModeSolo: '솔로',
      gameModeCoop: '협동',
      gameModeOnline: '온라인',
      gameModeSoloDesc: '싱글 플레이어 모드',
      gameModeCoopDesc: '협동 모드 (곧 출시)',
      gameModeOnlineDesc: '온라인 모드 (곧 출시)',
      blockRenderMode: '블록 렌더 모드',
      renderingModePrototype: '프로토타입 (색상)',
      renderingModeModern: '모던 (아틀라스)',
      renderingModeDesc: '프로토타입 — 색상; 모던 — 아틀라스 텍스처',
      worldSeed: '월드 시드',
      worldSeedPlaceholder: '랜덤 시드',
      worldSeedDesc: '결정론적 월드 생성용 숫자 시드',
      startGame: '게임 시작',
      back: '뒤로'
    },
    options: {
      title: '설정',
      language: '언어',
      renderDistance: '렌더 거리',
      renderDistanceDesc: '플레이어 주변에 로드되는 청크 수 (1-7)',
      fogDensity: '안개 밀도',
      fogDensityDesc: '안개의 두께 (0.1-2.0)',
      biomeSize: '바이옴 크기',
      biomeSizeDesc: '바이옴 영역의 규모 (0.5-2.0)',
      chunkSize: '청크 크기',
      chunkSizeDesc: '청크당 육각형 수 (8-20)',
      maxLoadedChunks: '최대 로드 청크',
      maxLoadedChunksDesc: '메모리의 최대 청크 수 (5-30)',
      renderingMode: '렌더 모드',
      renderingModeDesc: '프로토타입 — 색상; 모던 — 아틀라스 텍스처',
      saveSettings: '설정 저장',
      reset: '재설정',
      back: '뒤로'
    },
    about: {
      title: 'Hexcraft 정보',
      description1: 'Hexcraft는 고유한 육각형 그리드 시스템으로 클래식한 블록 건설 경험을 재구상하는 복셀 기반 샌드박스 게임입니다. 전통적인 입방체 세계와 달리 Hexcraft는 지형 생성 및 건설 메커니즘에 대한 새로운 관점을 제공합니다.',
      description2: '게임은 각각 고유한 특성을 가진 다양한 바이옴을 가진 절차적으로 생성된 세계를 특징으로 합니다. 무성한 평원과 빽빽한 숲에서 건조한 사막과 얼어붙은 툰드라까지, 각 지역은 고유한 건축 자재와 환경적 도전을 제공합니다.',
      description3: '플레이어는 비행과 걷기 모드 간에 원활하게 전환할 수 있어 빠른 탐험과 지상 생존 게임플레이를 모두 허용합니다. 동적 청크 로딩 시스템은 광대하고 탐험 가능한 세계를 유지하면서 부드러운 성능을 보장합니다.',
      description4: '최신 웹 기술로 구축된 Hexcraft는 브라우저 기반 3D 게임에서 가능한 것의 한계를 넓힙니다. 직관적인 컨트롤과 친숙한 메커니즘은 초보자에게 접근 가능하게 만들면서 경험 많은 건축가에게 깊이를 제공합니다.',
      description5: '이 프로토타입 버전은 핵심 메커니즘을 보여주며 멀티플레이어 협력, 고급 제작 시스템 및 향상된 세계 상호 작용을 포함한 향후 기능을 위한 기반 역할을 합니다.',
      developmentTeam: '개발 팀',
      createdBy: 'С4m1r (c4m1r.github.io)가 열정으로 제작했습니다.',
      technologyStack: '기술 스택',
      tech1: '3D 렌더링 및 그래픽용 Three.js',
      tech2: 'UI 컴포넌트 및 상태 관리용 React',
      tech3: '타입 안전 개발용 TypeScript',
      tech4: '무한 세계를 위한 절차 생성 알고리즘',
      backToMenu: '메뉴로 돌아가기'
    },
    gameUI: {
      helpHint: '` 키를 눌러 디버그',
      debug: '디버그',
      move: 'WASD - 이동',
      toggleFlyWalk: '스페이스바 (2x) - 비행/걷기 전환',
      jumpWalk: '스페이스바 - 점프 (걷기) / 위쪽 (비행)',
      downFly: 'Shift - 아래쪽 (비행)',
      breakBlock: '왼쪽 클릭 - 블록 파괴',
      placeBlock: '오른쪽 클릭 - 블록 배치',
      pickupItems: 'E - 아이템 줍기',
      selectBlock: '1-9,0 - 블록 선택',
      inventory: 'TAB - 인벤토리',
      toggleRenderingMode: 'F2 - 렌더링 모드 전환',
      toggleDebug: '~ - 디버그 전환',
      toggleFogBarrier: 'F - 안개 장벽 전환',
      closeMenu: 'ESC - 메뉴',
      time: '시간',
      generationCode: '생성 코드',
      generationStatus: '생성 상태',
      mode: '모드',
      fly: '비행',
      walk: '걷기',
      fogOn: '켜짐',
      fogOff: '꺼짐',
      block: '블록',
      biome: '바이옴'
    },
    inventory: {
      helmet: '투구',
      chestplate: '흉갑',
      leggings: '각반',
      boots: '부츠',
      cape: '망토',
      head: '머리',
      chest: '가슴',
      legs: '다리',
      cape_vanity: '망토 (허영)',
      amulet: '목걸이',
      ring1: '반지 1',
      ring2: '반지 2',
      artifact1: '유물 1',
      artifact2: '유물 2',
      stoneBlock: '돌 블록',
      woodBlock: '나무 블록',
      bronzeOre: '청동 광석',
      grassBlock: '풀 블록',
      dirtBlock: '흙 블록',
      sandBlock: '모래 블록',
      leavesBlock: '잎 블록',
      snowBlock: '눈 블록',
      iceBlock: '얼음 블록',
      lavaBlock: '용암 블록',
      playersOnline: '온라인 플레이어'
    }
  },
  ja: {
    mainMenu: {
      newGame: '新しいゲーム',
      loadGame: 'ゲームを読み込む',
      coop: '襲撃',
      options: '設定',
      about: 'について'
    },
    worldSetup: {
      title: 'ワールド設定',
      playerName: 'プレイヤー名',
      playerNamePlaceholder: '名前を入力',
      gameMode: 'ゲームモード',
      gameModeSolo: 'ソロ',
      gameModeCoop: '協力',
      gameModeOnline: 'オンライン',
      gameModeSoloDesc: 'シングルプレイヤーモード',
      gameModeCoopDesc: '協力モード（近日公開）',
      gameModeOnlineDesc: 'オンラインモード（近日公開）',
      blockRenderMode: 'ブロックレンダーモード',
      renderingModePrototype: 'プロトタイプ（色）',
      renderingModeModern: 'モダン（アトラス）',
      renderingModeDesc: 'プロトタイプ — 色; モダン — アトラステクスチャ',
      worldSeed: 'ワールドシード',
      worldSeedPlaceholder: 'ランダムシード',
      worldSeedDesc: '決定論的世界生成用の数値シード',
      startGame: 'ゲーム開始',
      back: '戻る'
    },
    options: {
      title: '設定',
      language: '言語',
      renderDistance: 'レンダー距離',
      renderDistanceDesc: 'プレイヤー周辺に読み込まれるチャンク数 (1-7)',
      fogDensity: '霧の密度',
      fogDensityDesc: '霧の厚さ (0.1-2.0)',
      biomeSize: 'バイオームサイズ',
      biomeSizeDesc: 'バイオーム領域のスケール (0.5-2.0)',
      chunkSize: 'チャンクサイズ',
      chunkSizeDesc: 'チャンクあたりの六角形数 (8-20)',
      maxLoadedChunks: '最大読み込みチャンク',
      maxLoadedChunksDesc: 'メモリ内の最大チャンク数 (5-30)',
      renderingMode: 'レンダーモード',
      renderingModeDesc: 'プロトタイプ — 色; モダン — アトラステクスチャ',
      saveSettings: '設定を保存',
      reset: 'リセット',
      back: '戻る'
    },
    about: {
      title: 'Hexcraftについて',
      description1: 'Hexcraftは、ユニークな六角形グリッドシステムでクラシックなブロック構築体験を再構築するボクセルベースのサンドボックスゲームです。従来の立方体の世界とは異なり、Hexcraftは地形生成と建設メカニクスに新しい視点を提供します。',
      description2: 'ゲームには、それぞれ独自の特徴を持つ多様なバイオームを持つ手続き的に生成された世界が特徴です。豊かな平原と密な森から乾燥した砂漠や凍ったツンドラまで、各地域は独自の建築材料と環境の課題を提供します。',
      description3: 'プレイヤーは飛行モードと歩行モードをシームレスに切り替えることができ、迅速な探索と地面に足をつけたサバイバルゲームプレイの両方を可能にします。動的チャンクローディングシステムは、広大で探索可能な世界を維持しながら、スムーズなパフォーマンスを保証します。',
      description4: '最新のWeb技術で構築されたHexcraftは、ブラウザベースの3Dゲームで可能なことの限界を押し広げます。直感的なコントロールと親しみやすいメカニクスは、初心者にとってアクセスしやすくしながら、経験豊富なビルダーに深みを提供します。',
      description5: 'このプロトタイプバージョンは、コアメカニクスを紹介し、マルチプレイヤー協力、高度なクラフティングシステム、強化された世界の相互作用を含む将来の機能の基盤として機能します。',
      developmentTeam: '開発チーム',
      createdBy: 'С4m1r (c4m1r.github.io) が情熱を持って作成しました。',
      technologyStack: '技術スタック',
      tech1: '3Dレンダリングとグラフィックス用のThree.js',
      tech2: 'UIコンポーネントと状態管理用のReact',
      tech3: '型安全な開発用のTypeScript',
      tech4: '無限の世界のための手続き生成アルゴリズム',
      backToMenu: 'メニューに戻る'
    },
    gameUI: {
      helpHint: '` キーでデバッグ',
      debug: 'デバッグ',
      move: 'WASD - 移動',
      toggleFlyWalk: 'スペース (2x) - 飛行/歩行切り替え',
      jumpWalk: 'スペース - ジャンプ (歩行) / 上昇 (飛行)',
      downFly: 'Shift - 下降 (飛行)',
      breakBlock: '左クリック - ブロック破壊',
      placeBlock: '右クリック - ブロック設置',
      pickupItems: 'E - アイテム拾得',
      selectBlock: '1-9,0 - ブロック選択',
      inventory: 'TAB - インベントリ',
      toggleRenderingMode: 'F2 - レンダリングモード切り替え',
      toggleDebug: '~ - デバッグ切り替え',
      toggleFogBarrier: 'F - 霧バリア切り替え',
      closeMenu: 'ESC - メニュー',
      time: '時間',
      generationCode: '生成コード',
      generationStatus: '生成ステータス',
      mode: 'モード',
      fly: '飛行',
      walk: '歩行',
      fogOn: 'オン',
      fogOff: 'オフ',
      block: 'ブロック',
      biome: 'バイオーム'
    },
    inventory: {
      helmet: 'ヘルメット',
      chestplate: 'チェストプレート',
      leggings: 'レギンス',
      boots: 'ブーツ',
      cape: 'ケープ',
      head: '頭',
      chest: '胸',
      legs: '脚',
      cape_vanity: 'ケープ (バニティ)',
      amulet: 'アミュレット',
      ring1: '指輪 1',
      ring2: '指輪 2',
      artifact1: 'アーティファクト 1',
      artifact2: 'アーティファクト 2',
      stoneBlock: '石ブロック',
      woodBlock: '木ブロック',
      bronzeOre: '銅鉱石',
      grassBlock: '草ブロック',
      dirtBlock: '土ブロック',
      sandBlock: '砂ブロック',
      leavesBlock: '葉ブロック',
      snowBlock: '雪ブロック',
      iceBlock: '氷ブロック',
      lavaBlock: '溶岩ブロック',
      playersOnline: 'オンラインプレイヤー'
    }
  }
};

export const languageNames: Record<Language, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  zh: '中文',
  ko: '한국어',
  ja: '日本語'
};

export function getTranslation(lang: Language): Translations {
  return translations[lang];
}

export function getLanguageName(lang: Language): string {
  return languageNames[lang];
}

