import { useForm } from 'react-hook-form';
import LanguageToggleButtons from '../../Components/Onboard/Form/LanguageToggleButtons';
import NameInputField from '../../Components/Onboard/Form/NameInputField';
import { useSubmitOnboardForm } from '../../hooks/forms/useSubmitOnboardForm';
import { CombinedFormProps } from '../../types/types';

export const OnboardForm = ({ onboardMode }: CombinedFormProps) => {
  const { handleSubmit, control, setValue, register, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(useSubmitOnboardForm(onboardMode))}>
      <LanguageToggleButtons control={control} setValue={setValue} />
      <NameInputField register={register} errors={errors} />
      <div className="__submit-button-container__ flex justify-center mt-7">
        <button className="bg-zinc-300 rounded border p-1 border-black" type="submit">Submit</button>
      </div>
    </form>
  );
};

export default OnboardForm;
//TODO: use a headless Combo-box to input another language and add it as selected.When you deselect that language it stays in the button list but is deselected.
//TODO: Style input box like headless input
