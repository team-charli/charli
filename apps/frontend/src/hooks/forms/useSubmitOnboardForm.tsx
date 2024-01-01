import {useEffect} from 'react'
import { submitOnboardLearnAPI } from "../../api/submitOnboardLearnAPI";
import { submitOnboardTeachAPI } from "../../api/submitOnboardTeachAPI";
import { OnboardContext } from "../../contexts/OnboardContext";
import { useContextNullCheck } from "../utils/useContextNullCheck";
import {OnboardFormData} from '../../types/types'
import { AuthContext } from '../../contexts/AuthContext';
import { useSupabase } from "../../contexts/SupabaseContext";

export const useSubmitOnboardForm = (onboardMode: "Learn" | "Teach" | null) => {
  const {isOnboarded, setIsOnboarded, learningLangs, teachingLangs, name, hasBalance, setTeachingLangs, setLearningLangs, setName } = useContextNullCheck(OnboardContext, "isOnboarded")

  const { client: supabaseClient, isLoading } = useSupabase();

 useEffect(() => {
    if (isLoading && !supabaseClient) {
      console.log("supabaseClient loading");
    } else if (!isLoading && !supabaseClient) {
      console.log("not loading but no client, investigate");
    } else if (!isLoading && supabaseClient) {
      console.log("has supabaseClient");
    }
  }, [isLoading, supabaseClient])

  return async (formData: OnboardFormData) => {
    if (isLoading) {
      console.error('Supabase client is still loading');
      return;
    }

    if (!supabaseClient) {
      console.error('Supabase client is not available');
      return;
    }
    setName(formData.name);

    const selectedLanguages = Object.keys(formData).filter(key =>
      formData[key] === true && key !== 'name'
    );

    if (onboardMode === "Learn") {
      setLearningLangs(selectedLanguages);
    } else {
      setTeachingLangs(selectedLanguages);
    }

    if (onboardMode === "Learn") {
      await submitOnboardLearnAPI(learningLangs, isOnboarded, name, hasBalance, setIsOnboarded, supabaseClient);
    } else if (onboardMode === "Teach")  {
      submitOnboardTeachAPI(isOnboarded, setIsOnboarded, teachingLangs, name, supabaseClient);
    } else {
      throw new Error('no onboard mode set')
    }
  };
};

