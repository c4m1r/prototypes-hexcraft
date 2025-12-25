import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface AboutPageProps {
  onBack: () => void;
}

export function AboutPage({ onBack }: AboutPageProps) {
  const { t } = useLanguage();

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
            <h1 className="text-4xl font-bold mb-8">{t.about.title}</h1>

            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>{t.about.description1}</p>
              <p>{t.about.description2}</p>
              <p>{t.about.description3}</p>
              <p>{t.about.description4}</p>
              <p>{t.about.description5}</p>

              <div className="mt-12 pt-8 border-t border-gray-700">
                <h2 className="text-2xl font-bold mb-4">{t.about.developmentTeam}</h2>
                <p>{t.about.createdBy}</p>
              </div>

              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">{t.about.technologyStack}</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>{t.about.tech1}</li>
                  <li>{t.about.tech2}</li>
                  <li>{t.about.tech3}</li>
                  <li>{t.about.tech4}</li>
                </ul>
              </div>
            </div>

            <button
              onClick={onBack}
              className="mt-12 px-8 py-3 bg-transparent border-2 border-white text-white text-lg font-medium hover:bg-white hover:text-black transition-all duration-300"
            >
              {t.about.backToMenu}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
