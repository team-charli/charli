// LanguageToggleButtons.tsx
import { LanguageButton, LanguageToggleButtonsProps } from '@/types/types';
import React, { MouseEvent } from 'react';

const LanguageToggleButtons = ({ languageButtons, onToggleLanguage }: LanguageToggleButtonsProps) => {
  const handleToggleClick = (e: MouseEvent<HTMLButtonElement>, languageButton: LanguageButton) => {
    e.preventDefault();
    onToggleLanguage(languageButton);
  };

  return (
    <div className="__language-button-container__ grid grid-cols-4 gap-2 justify-center mt-24 w-1/3 mx-auto">
      {languageButtons.map((languageButton: LanguageButton) => (
        <button
          key={languageButton.language}
          type="button"
          onClick={(e) => handleToggleClick(e, languageButton)}
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
