// OnboardForm.tsx
import { useLanguageData } from '@/hooks/Onboard/OnboardForm/useLanguageData';
import { useUserData } from '@/hooks/Onboard/OnboardForm/useUserData';
import { OnboardFormProps, LanguageButton } from '@/types/types';
import React, { FormEvent } from 'react';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { submitOnboardLearnAPI } from '@/api/submitOnboardLearnAPI';
import { submitOnboardTeachAPI } from '@/api/submitOnboardTeachAPI';
import { useAuthOboardRouting } from '@/hooks/useAuthOnboardandRouting';

const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const { isLitLoggedIn } = useAuthOboardRouting();
  const {
    currentAccount,
    sessionSigs,
    isOnboarded,
    hasBalance,
    supabaseClient,
    supabaseLoading,
    setIsOnboarded,
    name,
    setName,
  } = useUserData();
  const { languageButtons, setLanguageButtons } = useLanguageData();

  const handleToggleLanguage = (languageButton: LanguageButton) => {
    setLanguageButtons(prevLanguageButtons =>
      prevLanguageButtons.map(lang =>
        lang.language === languageButton.language
          ? { ...lang, isSelected: !lang.isSelected }
          : lang
      )
    );
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Submit button clicked');

    const selectedLanguageCodes = languageButtons
    .filter(lang => lang.isSelected)
    .map(lang => lang.languageCode);

    console.log('Selected language codes:', selectedLanguageCodes);

    try {
      if (onboardMode === 'Learn') {
        console.log('Submitting learn onboarding');
        await submitOnboardLearnAPI(
          selectedLanguageCodes,
          isOnboarded,
          setIsOnboarded,
          name,
          hasBalance,
          supabaseClient,
          supabaseLoading,
          currentAccount,
          sessionSigs,
          isLitLoggedIn
        );
      } else {
        console.log('Submitting teach onboarding');
        await submitOnboardTeachAPI(
          selectedLanguageCodes,
          isOnboarded,
          setIsOnboarded,
          name,
          supabaseClient,
          supabaseLoading,
          currentAccount,
          sessionSigs,
          isLitLoggedIn
        );
      }
    } catch (error) {
      console.error('Error submitting onboarding:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <LanguageToggleButtons
        languageButtons={languageButtons}
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
