import React from 'react';
import { LanguageButton } from '@/types/types';

interface LanguageToggleButtonsProps {
  languageButtons: LanguageButton[];
  selectedLanguageIds: number[];
  onToggleLanguage: (languageButton: LanguageButton) => void;
}

const LanguageToggleButtons = ({
  languageButtons,
  selectedLanguageIds,
  onToggleLanguage
}: LanguageToggleButtonsProps) => {
  return (
    <div className="__language-button-container__ grid grid-cols-4 gap-2 justify-center mt-24 w-1/3 mx-auto">
      {languageButtons.map((languageButton) => (
        <button
          key={languageButton.id}
          type="button"
          onClick={() => onToggleLanguage(languageButton)}
          className={`rounded-full px-4 py-2 mx-1 text-sm border border-black transition-colors duration-300 ${
selectedLanguageIds.includes(languageButton.id) ? 'bg-black text-white' : 'bg-gray-300'
}`}
        >
          {languageButton.language} {languageButton.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggleButtons;
