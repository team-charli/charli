import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import LanguageToggleButtons from '../../Components/Onboard/Form/LanguageToggleButtons';
import NameInputField from '../../Components/Onboard/Form/NameInputField';
import SearchLangComboBox from '../../Components/Onboard/Form/SearchLangComboBox';
import { useSubmitOnboardForm } from '../../hooks/forms/useSubmitOnboardForm';
import { useGetUsersFlags } from '../../hooks/geo/useGetUsersFlags';
import { CombinedFormProps, OnboardFormData, LanguageButton } from '../../types/types';
import isEqual from 'lodash.isequal';

export const OnboardForm = ({ onboardMode }: CombinedFormProps) => {
  const initialLanguages = useGetUsersFlags() || [];
  const [combinedLanguages, setCombinedLanguages] = useState<LanguageButton[]>(initialLanguages);
  const { handleSubmit, register, control, setValue, getValues, formState: { errors } } = useForm<OnboardFormData>();
  const callback = useSubmitOnboardForm(onboardMode);

  useEffect(() => {
    console.log(`initialLanguages: ${initialLanguages}`)
    console.log(`combinedLanguages: ${combinedLanguages}`);

    // if (!isEqual(initialLanguages, combinedLanguages)) {
      console.log('passed isEqual, setting combinedLanguages with initialLanguages: ', initialLanguages )
      setCombinedLanguages(initialLanguages);
    // }
  }, [initialLanguages]);

  return (
    <div>
      <SearchLangComboBox
        control={control}
        setValue ={setValue}
        getValues={getValues}
        combinedLanguages={combinedLanguages}
        setCombinedLanguages={setCombinedLanguages}
      />
      <form onSubmit={handleSubmit(callback)}>
        <LanguageToggleButtons
          control={control}
          setValue={setValue}
          combinedLanguages={combinedLanguages}
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
//TODO: The language must associate the teaching langs with countries in db, in order to provide students teachers from the countries they're shown
//OPTIM: Eventually flags should be drawn from where we have the most teachers

