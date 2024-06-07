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
    <div className="flex justify-center">
    <div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search languages"
        className="w-full p-2 border-2 border-2 border-black rounded-lg focus:border-blue-500 focus:outline-none"

      />
      <ul>
        {filteredLanguageOptions.map((language) => (
          <li key={language.language}>
            <button className="text-left px-4 py-2 hover:bg-gray-100" onClick={() => handleSelectLanguage(language)}>
              {language.language} {language.flag}
            </button>
          </li>
        ))}
      </ul>
    </div>
  </div>
  );
};

export default SearchLangComboBox;
