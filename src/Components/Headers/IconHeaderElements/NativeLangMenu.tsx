import { useContextNullCheck } from '../../../hooks/utils/useContextNullCheck'
import { StateContext } from '../../../contexts/StateContext'
import { CheckIcon } from '@heroicons/react/20/solid'
import { Listbox } from '@headlessui/react'
import globe_icon from '../../../assets/globe.png'
import { Fragment, useState } from 'react';

interface NativeLangMenuPropTypes {
  languages: string[] ;
}
const NativeLangMenu = ({ languages }: NativeLangMenuPropTypes) => {
  const { setNativeLang, nativeLang } = useContextNullCheck(StateContext);
  const [selectedLang, setSelectedLang] = useState<string>(nativeLang || languages[0] || '');

  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    if (newLang !== nativeLang) {
      setNativeLang(newLang);
    }
  };
//TODO: Fix style
  return (
    <Listbox value={selectedLang} onChange={handleLanguageChange}>
      <Listbox.Button><img className="w-10 mt-5 mr-16" src={globe_icon} /></Listbox.Button>
      <Listbox.Options>
        {languages.map(lang => (
          <Listbox.Option key={lang} value={lang} as={Fragment}>
            {({ active, selected }) => (
              <li
                className={`${
active ? 'bg-blue-500 text-white w-7' : 'bg-white text-black w-7'
}`}
              >
                {selected && <CheckIcon />}
                {selectedLang}
              </li>
            )}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
}
export default NativeLangMenu
