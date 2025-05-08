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
    <div className="w-full bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-screen-lg mx-auto px-2 sm:px-4 md:px-6">
        <div className="flex justify-start sm:justify-center overflow-x-auto scrollbar-hide py-2 sm:py-3 md:py-4">
          <div className="flex space-x-2 sm:space-x-3 md:space-x-4 min-w-full sm:min-w-0">
            {languagesToShow.map((lang, index) => (
              <div key={index} className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedLang(lang.name)}
                  className={`
                    px-3 sm:px-4 md:px-5 
                    py-1 sm:py-1.5 md:py-2 
                    whitespace-nowrap 
                    text-sm sm:text-base md:text-lg
                    font-medium
                    rounded-md
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    transition-colors duration-200
                    ${selectedLang === lang.name 
                      ? 'text-blue-700 bg-blue-50 border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'}
                  `}
                >
                  {lang.display}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LangNav

