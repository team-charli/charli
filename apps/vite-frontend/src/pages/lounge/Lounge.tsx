// Lounge.tsx
import { useEffect, useState } from 'react'
import IconHeader from '@/components/IconHeader'
import DropDownButton from './Components/Interactions/DropDownButton'
import LangNav from './Components/Interactions/LangNav'
import { UserView } from './Components/UserView'
import { useLangNavDataQuery } from './hooks/QueriesMutations/useLangNavDataQuery'
import { useAtomValue } from 'jotai'
import { onboardModeAtom } from '@/atoms/atoms'

interface Language {
  id: number;
  name: string;
  language_code: string;
  country_code: string | null;
  emoji: string | null;
}

export const Lounge = () => {
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
    </>
  );
};

export default Lounge;
