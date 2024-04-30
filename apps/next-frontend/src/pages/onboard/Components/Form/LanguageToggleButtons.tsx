// LanguageToggleButtons.tsx
import { LanguageButton, LanguageToggleButtonsProps } from '@/types/types';
import React from 'react';

const LanguageToggleButtons = ({ selectedLanguages, onToggleLanguage }: LanguageToggleButtonsProps ) => {
  return (
    <div className="__language-button-container__ grid grid-cols-4 gap-2 justify-center mt-24 w-1/3 mx-auto">
      {selectedLanguages.map(( languageButton: LanguageButton ) => (
        <button
          key={languageButton.language}
          onClick={() => onToggleLanguage(languageButton)}
          className={`rounded-full px-4 py-2 mx-1 text-sm border border-black transition-colors duration-300 ${
          languageButton.isSelected ? 'bg-black text-white' : 'bg-gray-300'
          }`}
        >
          {languageButton.language} {languageButton.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggleButtons;
