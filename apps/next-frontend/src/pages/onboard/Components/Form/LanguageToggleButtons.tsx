// LanguageToggleButtons.tsx
import React from 'react';

const LanguageToggleButtons = ({ selectedLanguages, onToggleLanguage }) => {
  return (
    <div>
      {selectedLanguages.map((languageButton: LanguageButton ) => (
        <button
          key={languageButton.language}
          onClick={() => onToggleLanguage(languageButton)}
          className={languageButton.isSelected ? 'selected' : ''}
        >
          {languageButton.language} {languageButton.primaryFlag}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggleButtons;
