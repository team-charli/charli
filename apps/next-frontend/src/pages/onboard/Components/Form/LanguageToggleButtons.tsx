// LanguageToggleButtons.tsx
import { LanguageButton, LanguageToggleButtonsProps } from '@/types/types';
import React from 'react';

const LanguageToggleButtons = ({ selectedLanguages, onToggleLanguage }: LanguageToggleButtonsProps ) => {
  return (
    <div>
      {selectedLanguages.map(( languageButton: LanguageButton ) => (
        <button
          key={languageButton.language}
          onClick={() => onToggleLanguage(languageButton)}
          className={languageButton.isSelected ? 'selected' : ''}
        >
          {languageButton.language} {languageButton.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggleButtons;
