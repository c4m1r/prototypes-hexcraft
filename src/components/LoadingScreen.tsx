
interface LoadingScreenProps {
  progress: number;
  status: string;
}

export function LoadingScreen({ progress, status }: LoadingScreenProps) {

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-6xl font-bold text-white mb-8 tracking-wider">
          HEXCRAFT
        </h1>

        <div className="w-96 bg-gray-900 border border-white/20 rounded-lg p-6">
          <div className="text-white text-lg mb-4 text-center">{status}</div>
          
          <div className="w-full bg-gray-800 rounded-full h-4 mb-2">
            <div
              className="bg-white h-4 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          
          <div className="text-gray-400 text-sm text-center">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}

