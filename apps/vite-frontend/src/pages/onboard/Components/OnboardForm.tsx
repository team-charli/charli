import React, { useState, FormEvent } from 'react';
import { useAtomValue } from 'jotai';
import { LanguageButton } from '@/types/types';
import LanguageToggleButtons from './Form/LanguageToggleButtons';
import NameInputField from './Form/NameInputField';
import { /*useHasBalance */} from '@/contexts/AuthContext';
import { useLanguageData } from '../hooks/OnboardForm/useLanguageData';
import { useOnboardLearnMutation } from '../hooks/Mutations/useOnboardLearnMutation';
import { useOnboardTeachMutation } from '../hooks/Mutations/useOnboardTeachMutation';

interface OnboardFormProps {
  onboardMode: 'Learn' | 'Teach' | null;
}

const OnboardForm = ({ onboardMode }: OnboardFormProps) => {
  // const {data: hasBalance}  = useHasBalance();

  const { data: languageButtons = [], isLoading, error } = useLanguageData();
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [name, setName] = useState('');

  const { mutate: onboardLearn, isError: onboardLearnIsError, error: onboardLearnError } = useOnboardLearnMutation();
  const { mutate: onboardTeach, isError: onboardTeachIsError, error: onboardTeachError } = useOnboardTeachMutation();

  const handleToggleLanguage = (toggledButton: LanguageButton) => {
    setSelectedLanguageIds(prevIds =>
      prevIds.includes(toggledButton.id)
        ? prevIds.filter(id => id !== toggledButton.id)
        : [...prevIds, toggledButton.id]
    );
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const commonData = {
      selectedLanguageCodes: selectedLanguageIds,
      name,
      nativeLang: navigator.language,
    };

    if (onboardMode === 'Learn') {
      onboardLearn(commonData);
    } else {
      onboardTeach({
        ...commonData,
        defaultNativeLanguage: navigator.language,
      });
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-10 md:py-12">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-blue-200 mb-4"></div>
        <p className="text-base sm:text-lg md:text-xl text-gray-600">Loading languages...</p>
      </div>
    </div>
  );
  
  if (error) {
    console.error(error);
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10 md:py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-6 max-w-md w-full mx-4">
          <h3 className="text-lg sm:text-xl font-medium text-red-800 mb-2">Error Loading Languages</h3>
          <p className="text-sm sm:text-base text-red-600">
            There was a problem loading the language data. Please try again.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-10">
      <div className="space-y-6 sm:space-y-8 md:space-y-10">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2 sm:mb-3 text-center">
            {onboardMode === 'Learn' ? 'What languages do you want to learn?' : 'What languages can you teach?'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 text-center">
            Select all languages that apply to you.
          </p>
          <LanguageToggleButtons
            languageButtons={languageButtons}
            selectedLanguageIds={selectedLanguageIds}
            onToggleLanguage={handleToggleLanguage}
          />
          {selectedLanguageIds.length === 0 && (
            <p className="text-xs sm:text-sm text-red-500 mt-2 text-center">
              Please select at least one language.
            </p>
          )}
        </div>
        
        <NameInputField name={name} onNameChange={handleNameChange} />
        
        <div className="flex justify-center mt-6 sm:mt-8 md:mt-10">
          <button 
            className={`px-5 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 
                      text-sm sm:text-base md:text-lg 
                      font-medium text-white 
                      bg-blue-600 hover:bg-blue-700 
                      rounded-md shadow-sm
                      transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${(!name || selectedLanguageIds.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`} 
            type="submit"
            disabled={!name || selectedLanguageIds.length === 0}
          >
            {onboardMode === 'Learn' ? 'Start Learning' : 'Start Teaching'}
          </button>
        </div>
        
        {(onboardLearnIsError || onboardTeachIsError) && (
          <div className="mt-4 p-3 border border-red-300 bg-red-50 rounded-md text-sm text-red-700 text-center">
            {onboardLearnError?.message || onboardTeachError?.message || "An error occurred. Please try again."}
          </div>
        )}
      </div>
    </form>
  );
};

export default OnboardForm;
