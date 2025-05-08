// SearchLangComboBox.tsx
import { LanguageButton, SearchLangComboBoxProps } from '@/types/types';
import React, { useState } from 'react';

const SearchLangComboBox = ({
  languageButtons,
  // setLanguageButtons,
  onSelectLanguage,
}: SearchLangComboBoxProps ) => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageButton>();
  // console.log("selectedLanguage", selectedLanguage)
  const [query, setQuery] = useState('');

  const filteredLanguageOptions = query ? languageButtons.filter((language) =>
    language.language.toLowerCase().includes(query.toLowerCase())
  )
    : languageButtons;

  const handleSelectLanguage = (language: LanguageButton) => {
    setSelectedLanguage(language);
    onSelectLanguage(language);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-4 sm:mt-6 md:mt-8 px-4 sm:px-0">
      <div className="flex flex-col">
        <label className="block text-sm sm:text-base md:text-lg font-medium text-gray-700 mb-1 sm:mb-2">
          Search Languages
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search languages..."
            className="w-full pl-10 pr-3 py-2 sm:py-2.5 
                    border border-gray-300 
                    rounded-md 
                    text-sm sm:text-base 
                    shadow-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {filteredLanguageOptions.length > 0 && (
          <div className="mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-48 sm:max-h-60 md:max-h-72 overflow-y-auto">
            <ul className="py-1">
              {filteredLanguageOptions.map((language) => (
                <li key={language.language}>
                  <button 
                    className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 
                             text-sm sm:text-base text-gray-700
                             hover:bg-blue-50 hover:text-blue-700
                             transition-colors duration-150
                             focus:outline-none focus:bg-blue-50"
                    onClick={() => handleSelectLanguage(language)}
                  >
                    <div className="flex items-center">
                      <span className="text-lg sm:text-xl mr-2">{language.flag}</span>
                      <span>{language.language}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {query && filteredLanguageOptions.length === 0 && (
          <div className="mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm p-3 text-center text-sm text-gray-500">
            No languages found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchLangComboBox;
