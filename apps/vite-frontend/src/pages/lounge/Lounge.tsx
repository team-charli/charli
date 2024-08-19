// Lounge.tsx
import { useState } from 'react'
import IconHeader from '@/components/IconHeader'
import DropDownButton from './Components/Interactions/DropDownButton'
import LangNav from './Components/Interactions/LangNav'
import { UserView } from './Components/UserView'
import { useLangNavDataQuery } from './hooks/QueriesMutations/useLangNavDataQuery'

interface Language {
  id: number;
  name: string;
  language_code: string;
  country_code: string | null;
  emoji: string | null;
}

export const Lounge = () => {
  const [modeView, setModeView] = useState<"Learn" | "Teach">("Learn")
  const [selectedLang, setSelectedLang] = useState<string>("");
  const { languagesToShow, isLoading, error } = useLangNavDataQuery(modeView, setSelectedLang, selectedLang);

  return (
    <>
      <IconHeader />
      <LangNav
        setSelectedLang={setSelectedLang}
        selectedLang={selectedLang}
        languagesToShow={languagesToShow}
      />
      <DropDownButton modeView={modeView} setModeView={setModeView} />
      <UserView modeView={modeView} selectedLang={selectedLang} />
    </>
  )
}

export default Lounge
