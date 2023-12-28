import { submitOnboardLearnAPI } from "../../api/submitOnboardLearnAPI";
import { submitOnboardTeachAPI } from "../../api/submitOnboardTeachAPI";
import { OnboardContext } from "../../contexts/OnboardContext";
import { useContextNullCheck } from "../utils/useContextNullCheck";
import {OnboardFormData} from '../../types/types'
import { AuthContext } from '../../contexts/AuthContext';

export const useSubmitOnboardForm = (onboardMode: "Learn" | "Teach" | null) => {
  const {isOnboarded, setIsOnboarded, learningLangs, teachingLangs, name, hasBalance, setTeachingLangs, setLearningLangs, setName } = useContextNullCheck(OnboardContext, "isOnboarded")
  const { currentAccount,  sessionSigs, jwt, supabaseClient } = useContextNullCheck(AuthContext, 'currentAccount', 'sessionSigs', 'jwt', 'supabaseClient');

  return async (formData: OnboardFormData) => {
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
      await submitOnboardLearnAPI(learningLangs, isOnboarded, name, hasBalance, setIsOnboarded, currentAccount, sessionSigs, supabaseClient, jwt);
    } else if (onboardMode === "Teach")  {
      submitOnboardTeachAPI(isOnboarded, setIsOnboarded, teachingLangs, name,  currentAccount, sessionSigs, jwt, supabaseClient);
    } else {
      throw new Error('no onboard mode set')
    }
  };
};

