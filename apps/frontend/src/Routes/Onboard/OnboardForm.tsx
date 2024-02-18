import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import LanguageToggleButtons from './Components/Form/LanguageToggleButtons';
import NameInputField from './Components/Form/NameInputField';
import SearchLangComboBox from './Components/Form/SearchLangComboBox';
import { submitOnboardForm } from './Components/Form/SubmitOnboardForm';
import { useGetUsersFlags } from '../../hooks/geo/useGetUsersFlags';
import { CombinedFormProps, OnboardFormData, LanguageButton } from '../../types/types';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useOnboardContext } from '../../contexts/OnboardContext';
import { IRelayPKP, SessionSig, SessionSigs } from '@lit-protocol/types';
import useLocalStorage from '@rehooks/local-storage';

export const OnboardForm = ({ onboardMode }: CombinedFormProps) => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const {isOnboarded, setIsOnboarded, learningLangs, teachingLangs, name, hasBalance, setTeachingLangs, setLearningLangs, setName } = useOnboardContext();
  const [currentAccount] = useLocalStorage<IRelayPKP>("currentAccount");
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs")
  const callback = submitOnboardForm(onboardMode, setName, name, setLearningLangs, setTeachingLangs, teachingLangs, learningLangs, currentAccount, sessionSigs, supabaseClient, supabaseLoading, setIsOnboarded, isOnboarded, hasBalance);

  const initialLanguages = useGetUsersFlags() || [];
  const [combinedLanguages, setCombinedLanguages] = useState<LanguageButton[]>([]);
  const { handleSubmit, register, control, setValue, getValues, formState: { errors }, watch } = useForm<OnboardFormData>();

  useEffect(() => {
    if (initialLanguages.length) {
      setCombinedLanguages(current => [...current, ...initialLanguages])
    }
  }, [initialLanguages])

  // Watch all form fields
  // const watchedFields = watch(); // Watch everything
  // useEffect(() => {
  //   console.log("formData", watchedFields); // Log the entire form data as it updates
  // }, [watchedFields]);

  return (
    <div>
      <SearchLangComboBox
        control={control}
        setValue ={setValue}
        getValues={getValues}
        combinedLanguages={combinedLanguages}
        setCombinedLanguages={setCombinedLanguages}
      />
      <form onSubmit={handleSubmit(callback)}>
        <LanguageToggleButtons
          control={control}
          setValue={setValue}
          combinedLanguages={combinedLanguages}
        />
        <NameInputField register={register} errors={errors} />
        <div className="__submit-button-container__ flex justify-center mt-7">
          <button className="bg-zinc-300 rounded border p-1 border-black" type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default OnboardForm;
//TODO: The language must associate the teaching langs with countries in db, in order to provide students teachers from the countries they're shown
//OPTIM: Eventually flags should be drawn from where we have the most teachers
