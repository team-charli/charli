// Lounge.tsx
import { useEffect, useState, useMemo } from 'react'
import IconHeader from '@/components/IconHeader'
import DropDownButton from './Components/Interactions/DropDownButton'
import LangNav from './Components/Interactions/LangNav'
import LearnerView from './Components/LearnerMode/LearnerView'
import TeacherView from './Components/TeacherMode/TeacherView'
import { useLangNavDataQuery } from '@/hooks/Lounge/QueriesMutations/useLangNavDataQuery'

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
      {modeView === "Learn" ? (
        <LearnerView modeView={modeView} selectedLang={selectedLang} />
      ) : (
          <TeacherView modeView={modeView} selectedLang={selectedLang} />
        )}
    </>
  )
}

export default Lounge
