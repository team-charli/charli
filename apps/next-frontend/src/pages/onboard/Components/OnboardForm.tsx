import React, { useState, FormEvent } from 'react';
import { useAtomValue } from 'jotai';
import { LanguageButton } from '@/types/types';
import { useOnboardLearnMutation } from '@/hooks/Onboard/Mutations/useOnboardLearnMutation';
import { useOnboardTeachMutation } from '@/hooks/Onboard/Mutations/useOnboardTeachMutation';
import { useLanguageData } from '@/hooks/Onboard/OnboardForm/useLanguageData';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { /*useHasBalance, */useIsOnboarded } from '@/contexts/AuthContext';

interface OnboardFormProps {
  onboardMode: 'Learn' | 'Teach' | null;
}

const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const {data: isOnboarded}  = useIsOnboarded();
  // const {data: hasBalance}  = useHasBalance();

  const { data: languageButtons = [], isLoading, error } = useLanguageData();
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [name, setName] = useState('');

  const { mutate: onboardLearn, isError: onboardLearnIsError, error: onboardLearnError } = useOnboardLearnMutation();
  const { mutate: onboardTeach, isError: onboardTeachIsError, error: onboardTeachError } = useOnboardTeachMutation();

  const handleToggleLanguage = (toggledButton: LanguageButton) => {
    setSelectedLanguageIds(prevIds =>
      prevIds.includes(toggledButton.id)
        ? prevIds.filter(id => id !== toggledButton.id)
        : [...prevIds, toggledButton.id]
    );
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const commonData = {
      selectedLanguageCodes: selectedLanguageIds,
      name,
      nativeLang: navigator.language,
    };

    if (onboardMode === 'Learn') {
      onboardLearn(commonData);
    } else {
      onboardTeach({
        ...commonData,
        defaultNativeLanguage: navigator.language,
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) console.error(error);

  return (
    <form onSubmit={handleSubmit}>
      <LanguageToggleButtons
        languageButtons={languageButtons}
        selectedLanguageIds={selectedLanguageIds}
        onToggleLanguage={handleToggleLanguage}
      />
      <NameInputField name={name} onNameChange={handleNameChange} />
      <div className="__submit-button-container__ flex justify-center mt-7">
        <button className="bg-zinc-300 rounded border p-1 border-black" type="submit">
          Submit
        </button>
      </div>
    </form>
  );
};

export default OnboardForm;
