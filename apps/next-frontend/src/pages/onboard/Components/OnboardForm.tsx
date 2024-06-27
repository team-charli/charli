// OnboardForm.tsx
import { useLanguageData } from '@/hooks/Onboard/OnboardForm/useLanguageData';
import { OnboardFormProps, LanguageButton } from '@/types/types';
import React, { FormEvent, useEffect, useState } from 'react';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { submitOnboardLearnAPI } from '@/api/submitOnboardLearnAPI';
import { submitOnboardTeachAPI } from '@/api/submitOnboardTeachAPI';
import { useAuthOnboardRouting } from '@/hooks/useAuthOnboardandRouting';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { useAtom } from 'jotai';
import { supabaseClientAtom } from '@/atoms/SupabaseClient/supabaseClientAtom';
import { isLitLoggedInAtom } from '@/atoms/LitAuth/isLitLoggedInAtom';
import { nativeLangAtom } from '@/atoms/atoms';
import { fetchLitAccountsAtom } from '@/atoms/LitAuth/litAccountsAtomQuery';
import { hasBalanceAtom } from '@/atoms/HasBalance/hasBalanceAtomQuery';
import { isOnboardedAtom } from '@/atoms/IsOnboarded/isOnboardedAtomQuery';
const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const [name, setName] = useState('');

  const [{ data: supabaseClient, isLoading: supabaseLoading }] = useAtom(supabaseClientAtom);
  const [ sessionSigs ] = useLocalStorage<SessionSigs | null>('sessionSigs')
  const isLitLoggedIn = useAtom(isLitLoggedInAtom)
  const [nativeLang] = useAtom(nativeLangAtom)
  const [{ data: currentAccount, isLoading: accountsLoading, error: accountsError }] = useAtom(fetchLitAccountsAtom);
  const [{data:hasBalance}] = useAtom(hasBalanceAtom);
  const [{data: isOnboarded}] = useAtom(isOnboardedAtom)
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
    .map(lang => lang.id);

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
          isLitLoggedIn,
          navigator.languages[0]
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
          isLitLoggedIn,
          navigator.languages[0]
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


