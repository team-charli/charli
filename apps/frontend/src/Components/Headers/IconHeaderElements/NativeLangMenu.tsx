import { useOnboardContext } from '../../../contexts/OnboardContext'
import { CheckIcon } from '@heroicons/react/20/solid'
import { Listbox } from '@headlessui/react'
import globe_icon from '../../../assets/globe.png'
import { Fragment, useState } from 'react';

interface NativeLangMenuPropTypes {
  languages: string[] ;
}
const NativeLangMenu = ({ languages }: NativeLangMenuPropTypes) => {
  const { setNativeLang, nativeLang } = useOnboardContext();
  const [selectedLang, setSelectedLang] = useState<string>(nativeLang || languages[0] || '');

  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    if (newLang !== nativeLang) {
      setNativeLang(newLang);
    }
  };
  return (
    <Listbox value={selectedLang} onChange={handleLanguageChange}>
      <Listbox.Button><img className="w-10" src={globe_icon} /></Listbox.Button>
      <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
        {languages.map(lang => (
          <Listbox.Option key={lang} value={lang} as={Fragment}>
            {({ active, selected }) => (
              <li
                className={`${
active ? 'bg-blue-500 text-white' : 'bg-white text-black'
} p-2`}
              >
                {selected && <CheckIcon className="inline-block w-5 h-5 mr-2" />}
                {lang}
              </li>
            )}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
}
export default NativeLangMenu;
