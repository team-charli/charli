// Lounge.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import IconHeader from '@/components/IconHeader'
import DropDownButton from './Components/Interactions/DropDownButton'
import LangNav from './Components/Interactions/LangNav'
import { UserView } from './Components/UserView'
import { useLangNavDataQuery } from './hooks/QueriesMutations/useLangNavDataQuery'
import { useAtomValue } from 'jotai'
import { onboardModeAtom } from '@/atoms/atoms'

export const Lounge = () => {
  const navigate = useNavigate();
  let initialModeView = useAtomValue(onboardModeAtom);
  if (!initialModeView) initialModeView = "Learn";
  const [modeView, setModeView] = useState<"Learn" | "Teach">(initialModeView);

  // Remove selectedLang from useLangNavDataQuery params
  const { languagesToShow, isLoading, error } = useLangNavDataQuery(modeView);

  // Initialize selectedLang after we have languagesToShow
  const [selectedLang, setSelectedLang] = useState<string>("");

  // Set initial language once languagesToShow is available
  useEffect(() => {
    if (languagesToShow.length > 0 && !selectedLang) {
      setSelectedLang(languagesToShow[0].name);
    }
  }, [languagesToShow]);

  //if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleRoboTest = () => {
    navigate({ to: '/robo-test' });
  };

  return (
    <>
      <IconHeader />
      <LangNav
        setSelectedLang={setSelectedLang}
        selectedLang={selectedLang}
        languagesToShow={languagesToShow}
      />
      <DropDownButton modeView={modeView} setModeView={setModeView} />
      {selectedLang && <UserView modeView={modeView} selectedLang={selectedLang} />}
      
      {/* RoboTest Button - Only shown in development environment */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-5 right-5 z-50">
          <button 
            onClick={handleRoboTest}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded flex items-center gap-2 shadow-lg"
          >
            <span role="img" aria-label="robot">🤖</span> RoboTest Mode
          </button>
        </div>
      )}
    </>
  );
};

export default Lounge;
