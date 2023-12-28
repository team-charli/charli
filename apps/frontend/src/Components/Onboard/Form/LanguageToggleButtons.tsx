import React from 'react';
import { Controller } from 'react-hook-form';
import { LanguageToggleButtonsProps, ToggleButtonProps } from '../../../types/types';

const LanguageToggleButtons = ({ control, setValue, combinedLanguages }: LanguageToggleButtonsProps) => {
  if (combinedLanguages.length === 0) {
    return null;
  }

  return (
    <div className="__language-button-container__ grid grid-cols-4 gap-2 justify-center mt-24 w-1/3 mx-auto">
      {combinedLanguages.map((language, index) => {
        // console.log(`inside combinedLanguages.map, language: ${JSON.stringify(language)}`);

        return (
          <React.Fragment key={index}>
            <ToggleButton
              key={`${language.language}-${language.primaryFlag}`}
              label={`${language.language}-${language.primaryFlag}`}
              name={`${language.language}-${language.primaryFlag}`}
              control={control}
              setValue={setValue}
            />
            {!language.omitSecondaryFlag && language.secondaryFlag && (
              <ToggleButton
                key={`${language.language}-${language.secondaryFlag}`}
                label={`${language.language}-${language.secondaryFlag}`}
                name={`${language.language}-${language.secondaryFlag}`}
                control={control}
                setValue={setValue}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const ToggleButton = ({ label, name, control, setValue }: ToggleButtonProps) => {
  // console.log(`Inside ToggleButton, name prop: ${name}`);
  // console.log(`Inside ToggleButton, label prop: ${label}`);
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

export default LanguageToggleButtons;
//FIX: Some buttons render larger
//TODO: Flags mean country-lang.  Fuzzy search the **country**

