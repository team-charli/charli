// SearchLangComboBox.tsx
import { LanguageButton, SearchLangComboBoxProps } from '@/types/types';
import React, { useState } from 'react';

const SearchLangComboBox = ({
  languageButtons,
  setLanguageButtons,
  onSelectLanguage,
}: SearchLangComboBoxProps ) => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageButton>();
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
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search languages"
      />
      <ul>
        {filteredLanguageOptions.map((language) => (
          <li key={language.language}>
            <button onClick={() => handleSelectLanguage(language)}>
              {language.language} {language.flag}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SearchLangComboBox;
