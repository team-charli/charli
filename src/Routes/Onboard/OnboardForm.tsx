import { useForm, Controller } from 'react-hook-form';
import { submitOnboardLearn } from "./API/onboardLearnAPI";
import { submitOnboardTeach } from "./API/onboardTeachAPI";
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { StateContext } from '../../contexts/StateContext'
import {ToggleButtonProps, CombinedFormProps, FormValues} from '../../types/types'

export const OnboardForm = ({ onboardMode, languages = ['English', 'Spanish', 'Chinese', 'Thai'] }: CombinedFormProps) => {

  const { hasBalance, teachingLangs } = useContextNullCheck(StateContext);
  const { handleSubmit, control, setValue, register, formState: { errors } } = useForm<FormValues>();

  const onSubmit = (values: FormValues) => {
    const selectedLanguages = languages.filter(language => values[language]);
    if (onboardMode === "Learn") {
      submitOnboardLearn({ langs: selectedLanguages, name: values.name, hasBalance, teachingLangs })
    } else {
      submitOnboardTeach({ langs: selectedLanguages, name: values.name })
    }
  };

  return (

    <form onSubmit={handleSubmit(onSubmit)}>
    <div className="__language-button-container__ flex justify-center mt-24">
      {languages.map(language => (
        <ToggleButton key={language} label={language} name={language} control={control} setValue={setValue} />
      ))}
    </div>
      <div className="__name-input-container__ flex justify-center mt-10">
      <label htmlFor="name" className="mr-2">Name:</label>
      <input className="border-2 border-black" {...register("name")} type="text" />
      {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div className="__submit-button-container__ flex justify-center mt-7">
      <button className="bg-zinc-300 rounded border p-1 border-black" type="submit">Submit</button>
      </div>
    </form>
  );
};

export default OnboardForm;


const ToggleButton = ({ label, name, control, setValue }: ToggleButtonProps) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <button
          type="button"
          className={`rounded-full px-4 py-2 mx-1 text-sm border border-black transition-colors duration-300 ${
            field.value ? 'bg-black text-white' : 'bg-gray-300'
          }`}
          onClick={() => setValue(name, !field.value)}
        >
          {label}
        </button>
      )}
    />
  );
};

