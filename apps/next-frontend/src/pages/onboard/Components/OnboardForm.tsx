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
import { useAuthOboardRouting } from '@/hooks/useAuthOnboardandRouting';

const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const { languageButtons, setLanguageButtons } = useLanguageData();
  // const context = useAuthOboardRouting();
  const {isLitLoggedIn} = useAuthOboardRouting();
  const {
    currentAccount,
    sessionSigs,
    // learningLangs, // already selected lanaguages? no. maybe for edit langs
    // teachingLangs,
    isOnboarded,
    hasBalance,
    supabaseClient,
    supabaseLoading,
    setIsOnboarded,
    name,
    setName,
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
      await submitOnboardLearnAPI(selectedLanguageCodes, isOnboarded,  setIsOnboarded,name, hasBalance, supabaseClient, supabaseLoading, currentAccount, sessionSigs, isLitLoggedIn)

    } else {
      await submitOnboardTeachAPI(selectedLanguageCodes, isOnboarded, setIsOnboarded, name, supabaseClient, supabaseLoading, currentAccount, sessionSigs, isLitLoggedIn)
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <SearchLangComboBox
        languageButtons={languageButtons}
        setLanguageButtons={setLanguageButtons}
        onSelectLanguage={handleSelectLanguage}
      />
      <LanguageToggleButtons
        languageButtons={languageButtons}
        selectedLanguages={selectedLanguages}
        onToggleLanguage={handleToggleLanguage}
      />
      <NameInputField name={name} onNameChange={handleNameChange} />
      <div className="__submit-button-container__ flex justify-center mt-7">
        <button className="bg-zinc-300 rounded border p-1 border-black" type="submit">Submit</button>
      </div>

    </form>
  );
};

export default OnboardForm;
