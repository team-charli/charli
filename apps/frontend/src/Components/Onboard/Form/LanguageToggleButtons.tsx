import { Controller } from 'react-hook-form';
import { ToggleButtonProps } from '../../../types/types';
import { useGetUsersFlags } from '../../../hooks/geo/useGetUsersFlags';


const LanguageToggleButtons = ({ control, setValue }: Pick<ToggleButtonProps, 'control' | 'setValue'>) => {
  const languages = useGetUsersFlags();

  return (
    <div className="__language-button-container__ flex justify-center mt-24">
      {languages.map(language => (
        <>
          <ToggleButton
            key={`${language.country_a2}-${language.primaryFlag}`}
            label={language.language}
            name={`${language.country_a2} ${language.primaryFlag}`}
            control={control}
            setValue={setValue}
          />
          {language.secondaryFlag && (
            <ToggleButton
              key={`${language.country_a2}-${language.secondaryFlag}`}
              label={language.language}
              name={`${language.country_a2} ${language.secondaryFlag}`}
              control={control}
              setValue={setValue}
            />
          )}
        </>
      ))}
    </div>
  );
};

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

export default LanguageToggleButtons;





