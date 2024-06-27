// OnboardForm.tsx
import { useLanguageData } from '@/hooks/Onboard/OnboardForm/useLanguageData';
import { OnboardFormProps, LanguageButton } from '@/types/types';
import React, { FormEvent, useState } from 'react';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { useAtom } from 'jotai';
import { supabaseClientAtom } from '@/atoms/SupabaseClient/supabaseClientAtom';
import { isLitLoggedInAtom } from '@/atoms/LitAuth/isLitLoggedInAtom';
import { nativeLangAtom } from '@/atoms/atoms';
import { fetchLitAccountsAtom } from '@/atoms/LitAuth/litAccountsAtomQuery';
import { hasBalanceAtom } from '@/atoms/HasBalance/hasBalanceAtomQuery';
import { isOnboardedAtom } from '@/atoms/IsOnboarded/isOnboardedAtomQuery';
import { onboardLearnMutationAtom } from '@/atoms/Mutations/Onboard/onboardLearnMutationAtom';
import { onboardTeachMutationAtom } from '@/atoms/Mutations/Onboard/onboardTeacMutationAtom';
import { litSessionAtom } from '@/atoms/LitAuth/sessionSigsAtomQuery';
const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  const [name, setName] = useState('');

  const [{ data: supabaseClient, isLoading: supabaseLoading }] = useAtom(supabaseClientAtom);
  const [isLitLoggedIn] = useAtom(isLitLoggedInAtom)
  const [nativeLang] = useAtom(nativeLangAtom)
  const [{ data: currentAccount, isLoading: accountsLoading, error: accountsError }] = useAtom(fetchLitAccountsAtom);
  const [{ data: sessionSigs, isLoading: sessionSigsLoading, error: sessionSigsError }] = useAtom(litSessionAtom);
  const [{data:hasBalance}] = useAtom(hasBalanceAtom);
  const [{data: isOnboarded}] = useAtom(isOnboardedAtom)
  const { languageButtons, setLanguageButtons } = useLanguageData();
  const [{ mutate: onboardLearn, isError: onboardLearnIsError, error: onboardLearnError }] = useAtom(onboardLearnMutationAtom);
  const [{ mutate: onboardTeach, isError: onboardTeachIsError, error: onboardTeachError }] = useAtom(onboardTeachMutationAtom);


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
        if (!currentAccount || !supabaseClient || !isLitLoggedIn) {
          throw new Error('Missing required data for onboarding');
        }

        console.log('Submitting learn onboarding');

        onboardLearn({
          selectedLanguageCodes,
          name,
          currentAccount,
          nativeLang: navigator.languages[0],
          supabaseClient
        });
      } else {
        if (!isLitLoggedIn || isOnboarded || !currentAccount || !sessionSigs || !selectedLanguageCodes.length || !name.length || !supabaseClient || supabaseLoading) {
          throw new Error('Missing required data for onboarding');
        }

        onboardTeach({
          selectedLanguageCodes,
          name,
          currentAccount,
          defaultNativeLanguage: navigator.languages[0],
          supabaseClient,
          sessionSigs
        });
        console.log('Submitting teach onboarding');
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


