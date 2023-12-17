import { useState, useDebugValue  } from 'react';
import { Combobox } from '@headlessui/react';
import languageDataset from '../../../data/languageDataset.json';
import _popFlags from '../../../data/highestPopulationPerLanguageWithFlags.json';
import { PopFlags, SearchLangComboBoxProps } from '../../../types/types';

const popFlags: PopFlags = _popFlags;

const SearchLangComboBox = ({
  combinedLanguages,
  setCombinedLanguages,
  control,
  setValue,
  getValues
}: SearchLangComboBoxProps) => {
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [query, setQuery] = useState('');

  const filteredLanguageOptions = query === ''
    ? Object.keys(languageDataset)
    : Object.keys(languageDataset).filter((language) =>
        language.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelectLanguage = (selectedLanguage: string) => {
    const flagData = popFlags[selectedLanguage];
    const primaryFlag = flagData ? flagData.flag : '';
    const buttonName = `${selectedLanguage}-${primaryFlag}`;

    // Check if language is already rendered as a button
    const isLanguageExists = combinedLanguages.some(lang => lang.language === selectedLanguage);
    console.log({isLanguageExists});

    if (isLanguageExists) {
      // Toggle selection state if button already exists
      const currentValue = getValues(buttonName);
      setValue(buttonName, !currentValue);
    } else {
      // Add new language button and select it
      console.log('called new button');

      const newLanguageButton = { language: selectedLanguage, primaryFlag };
      setCombinedLanguages(prev => [...prev, newLanguageButton]);
      setValue(buttonName, true);
    }
    console.log(`combinedLanguages ${combinedLanguages}`);

    console.log(`getValues, ${JSON.stringify(getValues())}`);

    setSelectedLanguage(''); // Reset combobox selection
  };

  return (
    <Combobox as="div" value={selectedLanguage} onChange={handleSelectLanguage}>
      <Combobox.Input
        as="input"
        onChange={(event) => setQuery(event.target.value)}
      />
      <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-auto">
        {filteredLanguageOptions.map((option, idx) => (
          <Combobox.Option key={idx} value={option} as="button" className="text-left px-4 py-2 hover:bg-gray-100">
            {option}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
};

export default SearchLangComboBox;
