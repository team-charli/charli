// LangNav.tsx
import { Dispatch, SetStateAction } from 'react'

interface LangNavProps {
  setSelectedLang: Dispatch<SetStateAction<string>>,
  selectedLang: string;
  languagesToShow: LanguageItem[];
}
interface LanguageItem {
  name: string;
  display: string;
}

const LangNav = ({setSelectedLang, selectedLang, languagesToShow}: LangNavProps) => {
  return(
    <div className="flex justify-center">
      <div className="flex space-x-2 overflow-x-auto py-2">
        {languagesToShow.map((lang, index) => (
          <div key={index} className="flex flex-col items-center cursor-pointer">
            <button
              onClick={() => setSelectedLang(lang.name)}
              className={`px-4 py-1 whitespace-nowrap focus:outline-none ${selectedLang === lang.name ? 'underline underline-offset-8 decoration-4 decoration-zinc-600' : ''}`}
            >
              {lang.display}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LangNav

