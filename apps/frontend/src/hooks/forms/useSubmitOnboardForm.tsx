import { useSubmitOnboardLearnAPI } from "../../api/useSubmitOnboardLearnAPI";
import { useSubmitOnboardTeachAPI } from "../../api/useSubmitOnboardTeachAPI";
import { OnboardContext } from "../../contexts/OnboardContext";
import { useContextNullCheck } from "../utils/useContextNullCheck";
import {OnboardFormData} from '../../types/types'

export const useSubmitOnboardForm = (onboardMode: "Learn" | "Teach" | null) => {
  const { setTeachingLangs, setLearningLangs, setName } = useContextNullCheck(OnboardContext);

  return async (formData: OnboardFormData) => {
    setName(formData.name);

    const languageData = formData.languages;
    const selectedLanguages = Object.keys(languageData).filter(key => languageData[key]);

    if (onboardMode === "Learn") {
      setLearningLangs(selectedLanguages);

    } else {
      setTeachingLangs(selectedLanguages);
    }

    if (onboardMode === "Learn") {
      useSubmitOnboardLearnAPI();
    } else if (onboardMode === "Teach")  {
      useSubmitOnboardTeachAPI();
    } else {
      throw new Error('no onboard mode set')
    }
  };
};

