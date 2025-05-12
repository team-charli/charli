import { CheckIcon } from '@heroicons/react/20/solid'
import { Listbox } from '@headlessui/react'
import globe_icon from '../../../assets/globe.png'
import { Fragment } from 'react';
import { nativeLangAtom, selectedLangAtom } from '@/atoms/atoms';
import { useAtom } from 'jotai';

interface NativeLangMenuPropTypes {
  languages: string[] ;
}
const NativeLangMenu = ({ languages }: NativeLangMenuPropTypes) => {
  const [nativeLang, setNativeLang] = useAtom(nativeLangAtom);
  const [selectedLang, setSelectedLang] = useAtom(selectedLangAtom);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    if (newLang !== nativeLang) {
      setNativeLang(newLang);
    }
  };
  return (
    <div className="relative">
      <div className="text-xs sm:text-sm md:text-base text-gray-600 mb-1 text-center font-medium">
        {selectedLang}
      </div>
      <Listbox value={selectedLang} onChange={handleLanguageChange}>
        <div className="relative">
          <Listbox.Button className="flex items-center justify-center p-1 sm:p-1.5 md:p-2 lg:p-3 
            rounded-full bg-white hover:bg-gray-50 border border-gray-200 shadow-sm
            transition-colors duration-200">
            <img 
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" 
              src={globe_icon} 
              alt="Select language" 
            />
            <span className="sr-only">Select language</span>
          </Listbox.Button>
          
          <Listbox.Options className="absolute right-0 z-50 mt-1 sm:mt-1.5 md:mt-2 
            max-h-48 sm:max-h-52 md:max-h-60 lg:max-h-72
            w-32 sm:w-40 md:w-48 lg:w-56
            overflow-auto rounded-md bg-white 
            py-1 sm:py-1.5 md:py-2 
            text-xs sm:text-sm md:text-base lg:text-lg
            shadow-lg ring-1 ring-black/5 focus:outline-none border border-gray-100">
            {languages.map(lang => (
              <Listbox.Option key={lang} value={lang} as={Fragment}>
                {({ active, selected }) => (
                  <li
                    className={`${
                      active ? 'bg-blue-50 text-blue-800' : 'text-gray-800'
                    } ${
                      selected ? 'bg-blue-50 font-medium' : ''
                    } px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 lg:py-3 cursor-pointer`}
                  >
                    <div className="flex items-center">
                      {selected && 
                        <CheckIcon className="inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 md:mr-2.5 text-blue-600" />
                      }
                      <span className={selected ? "ml-1" : "ml-6 sm:ml-7 md:ml-8"}>
                        {lang}
                      </span>
                    </div>
                  </li>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}
export default NativeLangMenu;
