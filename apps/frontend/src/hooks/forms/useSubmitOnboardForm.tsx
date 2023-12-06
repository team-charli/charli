import { submitOnboardLearn } from "../../api/onboardLearnAPI";
import { submitOnboardTeach } from "../../api/onboardTeachAPI";
import { CombinedFormProps } from '../../types/types'

const useSubmitForm = ({ onboardMode, languages }: CombinedFormProps) => {
  return (values) => {
    const selectedLanguages = languages.filter(language => values[language]);
    if (onboardMode === "Learn") {
      submitOnboardLearn({ langs: selectedLanguages, name: values.name })
    } else {
      submitOnboardTeach({ langs: selectedLanguages, name: values.name })
    }
  };
};

export default useSubmitForm;

