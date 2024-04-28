import {Dispatch, SetStateAction, useEffect} from 'react'
import { submitOnboardLearnAPI } from "../../../../api/submitOnboardLearnAPI";
import { submitOnboardTeachAPI } from "../../../../api/submitOnboardTeachAPI";
import {LocalStorageSetter, OnboardFormData} from '../../../../types/types'
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';
import { SupabaseClient } from '@supabase/supabase-js';
import useLocalStorage from '@rehooks/local-storage';

export const submitOnboardForm = (onboardMode: "Learn" | "Teach" | null, setName:Dispatch<SetStateAction<string>>, name: string, setLearningLangs:Dispatch<SetStateAction<string[]>>, setTeachingLangs:Dispatch<SetStateAction<string[]>>, teachingLangs: string[], learningLangs: string[], currentAccount: IRelayPKP | null, sessionSigs:SessionSigs | null, supabaseClient: SupabaseClient | null, supabaseLoading: boolean, setIsOnboarded: LocalStorageSetter<boolean>, isOnboarded: boolean | null, hasBalance: boolean | null) => {

  const [ isLitLoggedIn ] = useLocalStorage<boolean>("isLitLoggedIn");

  return async (formData: OnboardFormData) => {
    if (supabaseLoading) {
      console.error('Supabase client is still loading');
      return;
    }

    if (!supabaseClient) {
      console.error('Supabase client is not available');
      return;
    }

    console.log("formData", formData)
    setName(formData.name);

    const selectedLanguages = Object.keys(formData).filter(key =>
      formData[key] === true && key !== 'name'
    );

    if (onboardMode === "Learn") {
      console.log('selectedLanguages', selectedLanguages)
      setLearningLangs(selectedLanguages);
    } else {
      setTeachingLangs(selectedLanguages);
    }

    if (onboardMode === "Learn" && currentAccount && sessionSigs && supabaseClient) {
      console.log({name, learningLangs})
      await submitOnboardLearnAPI(learningLangs, isOnboarded, name, hasBalance, setIsOnboarded, supabaseClient, currentAccount, sessionSigs, isLitLoggedIn);
    } else if (onboardMode === "Teach" && currentAccount && sessionSigs && supabaseClient)  {
      submitOnboardTeachAPI(isOnboarded, setIsOnboarded, teachingLangs, name, supabaseClient, currentAccount, sessionSigs, isLitLoggedIn);
    } else {
      throw new Error('no onboard mode set')
    }
  };
};

