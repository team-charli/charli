// Lounge.tsx
import { useEffect, useState, useMemo } from 'react'
import DropDownButton from './Components/Interactions/DropDownButton'
import LangNav from './Components/Interactions/LangNav'
import LearnerView from './Components/Learner/LearnerView'
import TeacherView from './Components/Teacher/TeacherView'
import IconHeader from '@/components/IconHeader'
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
  const { data: languageData, isLoading, error } = useLangNavDataQuery();

  useEffect(() => {
    console.log('languageData', languageData)
  }, [languageData])

const languagesToShow = useMemo(() => {
  if (!languageData) return [];
  return (modeView === 'Learn'
    ? languageData.wantsToLearnLangs
    : languageData.wantsToTeachLangs
  ).filter((lang): lang is Language => lang !== null)
   .map(lang => ({ name: lang.name, display: `${lang.name} ${lang.emoji || ''}` }));
}, [modeView, languageData]);

  useEffect(() => {
    if (languagesToShow.length > 0) {
      const currentLangExists = languagesToShow.some(lang => lang.name === selectedLang);
      if (!currentLangExists) {
        setSelectedLang(languagesToShow[0].name);
      }
    }
  }, [languagesToShow, selectedLang]);

  if (isLoading) return <div>Loading...</div>;

  if (error) {console.error(error)};

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
