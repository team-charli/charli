// OnboardForm.tsx
import { useLanguageData } from '@/hooks/Onboard/OnboardForm/useLanguageData';
import { useUserData } from '@/hooks/Onboard/OnboardForm/useUserData';
import { OnboardFormProps, LanguageButton } from '@/types/types';
import React, { useState } from 'react';
import SearchLangComboBox from './Form/SearchLangComboBox';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { submitOnboardLearnAPI } from '@/api/submitOnboardLearnAPI';
import { submitOnboardTeachAPI } from '@/api/submitOnboardTeachAPI';

const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const { languageButtons, setLanguageButtons } = useLanguageData();
  const {
    currentAccount,
    sessionSigs,
    learningLangs, // already selected lanaguages? no. maybe for edit langs
    teachingLangs,
    isOnboarded,
    hasBalance,
    supabaseClient,
    supabaseLoading,
    setIsOnboarded,
    name,
    setName,
    isLitLoggedin,
  } = useUserData();

  const [selectedLanguages, setSelectedLanguages] = useState<LanguageButton[]>([]);

  const handleSelectLanguage = (language: LanguageButton) => {
    const isSelected = selectedLanguages.some( lang=> lang.language === language.language);
    if (isSelected) {
      setSelectedLanguages(prevSelected => prevSelected.filter((lang) => lang.language !== language.language));
    } else {
      setSelectedLanguages(prevSelected => [...prevSelected, language]);
    }
  };

  const handleToggleLanguage = (languageButton: LanguageButton) => {
    const updatedLanguages = selectedLanguages.map(selectedLang => selectedLang.language === languageButton.language ? { ...selectedLang, isSelected: !selectedLang.isSelected } : selectedLang);
    setSelectedLanguages(updatedLanguages);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => { setName(event.target.value); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLanguageCodes = selectedLanguages
    .filter(lang => lang.isSelected)
    .map((lang) => lang.language);

    if (onboardMode === 'Learn') {
      submitOnboardLearnAPI(selectedLanguageCodes, isOnboarded, name, hasBalance, setIsOnboarded, supabaseClient, supabaseLoading, currentAccount, sessionSigs, isLitLoggedin)

    } else {
      submitOnboardTeachAPI(selectedLanguageCodes, isOnboarded, name, setIsOnboarded, supabaseClient, supabaseLoading, currentAccount, sessionSigs, isLitLoggedin)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <SearchLangComboBox
        languageButtons={languageButtons}
        setLanguageButtons={setLanguageButtons}
        onSelectLanguage={handleSelectLanguage}
      />
      <LanguageToggleButtons
        selectedLanguages={selectedLanguages}
        onToggleLanguage={handleToggleLanguage}
      />
      <NameInputField name={name} onNameChange={handleNameChange} />
      <button type="submit">Submit</button>
    </form>
  );
};

export default OnboardForm;
