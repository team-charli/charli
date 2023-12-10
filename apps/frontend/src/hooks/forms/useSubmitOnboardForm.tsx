import { useSubmitOnboardLearnAPI } from "../../api/useSubmitOnboardLearnAPI";
import { useSubmitOnboardTeachAPI } from "../../api/useSubmitOnboardTeachAPI";
import { OnboardContext } from "../../contexts/OnboardContext";
import { useContextNullCheck } from "../utils/useContextNullCheck";

interface OnboardFormData {
  name: string;
  [key: string]: boolean; // For each language toggle button
}

export const useSubmitOnboardForm = (onboardMode: "Learn" | "Teach" | null) => {
  const { setTeachingLangs, setLearningLangs, setName } = useContextNullCheck(OnboardContext);

  return async (formData: OnboardFormData) => {
    setName(formData.name);

    const selectedLanguages = Object.keys(formData).filter(key => formData[key] === true);

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

