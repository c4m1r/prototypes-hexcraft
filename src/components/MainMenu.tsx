import { PixelRain } from './PixelRain';
import { useLanguage } from '../contexts/LanguageContext';

interface MainMenuProps {
  onNewGame: () => void;
  onLoadGame: () => void;
  onCoop: () => void;
  onOptions: () => void;
  onAbout: () => void;
}

export function MainMenu({ onNewGame, onLoadGame, onCoop, onOptions, onAbout }: MainMenuProps) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <PixelRain />

      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-6xl font-bold text-white mb-8 tracking-wider">
          HEXCRAFT
        </h1>

        <div className="flex flex-col gap-4 w-64">
          <button
            onClick={onNewGame}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
          >
            {t.mainMenu.newGame}
          </button>

          <button
            onClick={onLoadGame}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
          >
            {t.mainMenu.loadGame}
          </button>

          <button
            onClick={onCoop}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
          >
            {t.mainMenu.coop}
          </button>

          <button
            onClick={onOptions}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
          >
            {t.mainMenu.options}
          </button>

          <button
            onClick={onAbout}
            className="px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
          >
            {t.mainMenu.about}
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 text-green-500 text-sm font-mono animate-wave">
        <a
          href="https://c4m1r.github.io/"
          target="_self"
          className="hover:underline"
        >
          Prototype 0.1.6 | C4m1r.github.io
        </a>
      </div>
    </div>
  );
}
