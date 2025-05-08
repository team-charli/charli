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
    <div className="language-button-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 
                  gap-2 sm:gap-3 md:gap-4 
                  mt-6 sm:mt-8 md:mt-10 
                  w-full sm:w-4/5 md:w-3/4 lg:w-2/3 
                  mx-auto">
      {languageButtons.map((languageButton) => (
        <button
          key={languageButton.id}
          type="button"
          onClick={() => onToggleLanguage(languageButton)}
          className={`rounded-full 
                    px-2 sm:px-3 md:px-4 
                    py-1.5 sm:py-2 
                    text-xs sm:text-sm md:text-base 
                    border 
                    transition-colors duration-300 
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${selectedLanguageIds.includes(languageButton.id) 
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <span>{languageButton.flag}</span>
            <span>{languageButton.language}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default LanguageToggleButtons;
