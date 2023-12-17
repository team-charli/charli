import { useState } from 'react'
import { useForm} from 'react-hook-form';
import LanguageToggleButtons from '../../Components/Onboard/Form/LanguageToggleButtons';
import NameInputField from '../../Components/Onboard/Form/NameInputField';
import { useSubmitOnboardForm } from '../../hooks/forms/useSubmitOnboardForm';
import { CombinedFormProps, LanguageButton } from '../../types/types';
import { OnboardFormData } from '../../hooks/forms/useSubmitOnboardForm'
import SearchLangComboBox from '../../Components/Onboard/Form/SearchLangComboBox';
import { useGetUsersFlags } from '../../hooks/geo/useGetUsersFlags';

export const OnboardForm = ({ onboardMode }: CombinedFormProps) => {
  const [additionalLanguages, setAdditionalLanguages] = useState<LanguageButton[]>([]);
  const initialLanguages = useGetUsersFlags() || [];
  const combinedLanguages = [...initialLanguages, ...additionalLanguages];

  const { handleSubmit, register, control, setValue, formState: { errors } } = useForm<OnboardFormData>();
  const callback = useSubmitOnboardForm(onboardMode);

  return (
    <div>
      <SearchLangComboBox
        control={control}
        combinedLanguages={combinedLanguages}
        setCombinedLanguages={setCombinedLanguages}
        setAdditionalLanguages={setAdditionalLanguages}
      />

      <form onSubmit={handleSubmit(callback)}>
        <LanguageToggleButtons
          control={control}
          setValue={setValue}
          additionalLanguages={additionalLanguages}
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
//TODO: use a headless Combo-box to input another language and add it as selected.When you deselect that language it stays in the button list but is deselected.
//TODO: Style input box like headless input

