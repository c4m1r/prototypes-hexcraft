import React from 'react';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  return (
    <div className="fixed inset-0 bg-black text-white overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="relative">
          <img
            src="https://images.pexels.com/photos/1279813/pexels-photo-1279813.jpeg?auto=compress&cs=tinysrgb&w=400"
            alt="Hexcraft"
            className="absolute top-0 right-0 w-64 h-48 object-cover border-2 border-white"
          />

          <div className="pr-72">
            <h1 className="text-4xl font-bold mb-8">About Hexcraft</h1>

            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                Hexcraft is an voxel-based sandbox game that reimagines the classic
                block-building experience with a unique hexagonal grid system. Unlike traditional
                cubic worlds, Hexcraft offers a fresh perspective on terrain generation and
                construction mechanics.
              </p>

              <p>
                The game features procedurally generated worlds with diverse biomes, each with
                their own distinct characteristics. From lush plains and dense forests to arid
                deserts and frozen tundras, every region offers unique building materials and
                environmental challenges.
              </p>

              <p>
                Players can seamlessly switch between flight and walking modes, allowing for both
                rapid exploration and grounded survival gameplay. The dynamic chunk loading system
                ensures smooth performance while maintaining an expansive, explorable world.
              </p>

              <p>
                Built with modern web technologies, Hexcraft pushes the boundaries of what's
                possible in browser-based 3D gaming. The intuitive controls and familiar mechanics
                make it accessible to newcomers while offering depth for experienced builders.
              </p>

              <p>
                This prototype version showcases the core mechanics and serves as a foundation for
                future features including multiplayer cooperation, advanced crafting systems, and
                enhanced world interactions.
              </p>

              <div className="mt-12 pt-8 border-t border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Development Team</h2>
                <p>Created with passion by С4m1r (c4m1r.github.io).</p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Technology Stack</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>Three.js for 3D rendering and graphics</li>
                  <li>React for UI components and state management</li>
                  <li>TypeScript for type-safe development</li>
                  <li>Procedural generation algorithms for infinite worlds</li>
                </ul>
              </div>
            </div>

            <button
              onClick={onBack}
              className="mt-12 px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
