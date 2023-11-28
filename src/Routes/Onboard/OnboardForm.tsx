import { useForm, Controller } from 'react-hook-form';
import { submitOnboardLearn } from "./API/onboardLearnAPI";
import { submitOnboardTeach } from "./API/onboardTeachAPI";
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { StateContext } from '../../contexts/StateContext'
import {ToggleButtonProps, CombinedFormProps, FormValues} from '../../types/types'

//TODO: Actually rendering out of order. Submit button should set these values to the state context then generate the key.  (But then Again I already had the key, yet had not onboarded.) Interesting to see what the default is if you first-tie register.  In any case submit should always push vals to the context.  Then check if you have the key.  If you have the key then submit to db.  If you don't have the key then keep in context and submit AFTER key issued.
//TODO: Also figure out how to ask if teach and learn? Maybe a one more thing..."Do you wanna teach|learn as well? nah.. or sure.. (then what to teach|learn)"
//TODO: Pass the languages in as props.  But we're going to have to use locales. Meaning that es will be es-mx <flag>.  Already have the lang list. Create lookup function here.
//TODO: use a headless Combo-box to input another language and add it as selected.  When you deselect that language it stays in the button list but is deselected.
//TODO: add a couple of other spanish langs to demonstrate that there are multiple.
//TODO:  Style input box like headless input
//NOTE: Don't tolerate flashing anywhere.

export const OnboardForm = ({ onboardMode, languages = ['English', 'Spanish', 'Chinese', 'Thai' ] }: CombinedFormProps) => {

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
      <div className="__language-button-container__ flex justify-center mt-24
        border-black)">
        {languages.map(language => (
          <ToggleButton key={language} label={language} name={language} control={control} setValue={setValue} />
        ))}
      </div>
      <div className="__name-input-container__ flex justify-center mt-10 mr-10">
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
//OPTIM: ask gpt how to do the country lookup faster with my requirments
