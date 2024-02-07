import {useEffect} from 'react'
import { submitOnboardLearnAPI } from "../../api/submitOnboardLearnAPI";
import { submitOnboardTeachAPI } from "../../api/submitOnboardTeachAPI";
import {OnboardFormData} from '../../types/types'
import { useSupabase } from "../../contexts/SupabaseContext";
import { useOnboardContext } from '../../contexts/OnboardContext';
import { useAuthContext } from '../../contexts/AuthContext';
import useLocalStorage from '@rehooks/local-storage';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

export const useSubmitOnboardForm = (onboardMode: "Learn" | "Teach" | null) => {

  const {isOnboarded, setIsOnboarded, learningLangs, teachingLangs, name, hasBalance, setTeachingLangs, setLearningLangs, setName } = useOnboardContext();
  const [currentAccount] = useLocalStorage<IRelayPKP | null>("currentAccount");
  const [sessionSigs] = useLocalStorage<SessionSigs>("sessionSigs")

  const { client: supabaseClient, supabaseLoading } = useSupabase();

 useEffect(() => {
    if (supabaseLoading && !supabaseClient) {
      console.log("supabaseClient loading");
    } else if (!supabaseLoading && !supabaseClient) {
      console.log("not loading but no client, investigate");
    } else if (!supabaseLoading && supabaseClient) {
      console.log("has supabaseClient");
    }
  }, [supabaseLoading, supabaseClient])

  return async (formData: OnboardFormData) => {
    if (supabaseLoading) {
      console.error('Supabase client is still loading');
      return;
    }

    if (!supabaseClient) {
      console.error('Supabase client is not available');
      return;
    }
    setName(formData.name);
    //TODO: selectedLanguages not updating. Neither are learningLangs
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
      await submitOnboardLearnAPI(learningLangs, isOnboarded, name, hasBalance, setIsOnboarded, supabaseClient, currentAccount, sessionSigs);
    } else if (onboardMode === "Teach" && currentAccount && sessionSigs && supabaseClient)  {
      submitOnboardTeachAPI(isOnboarded, setIsOnboarded, teachingLangs, name, supabaseClient, currentAccount, sessionSigs);
    } else {
      throw new Error('no onboard mode set')
    }
  };
};

