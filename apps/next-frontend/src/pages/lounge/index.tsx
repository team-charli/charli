import { useState } from 'react'
import DropDownButton from './Components/Interactions/DropDownButton'
import useLangNavData from '../../hooks/Lounge/useLangNavData'
import LangNav from './Components/Interactions/LangNav'
import LearnerView from './Components/Learner/LearnerView'
import TeacherView from './Components/Teacher/TeacherView'
import IconHeader from '@/components/IconHeader'

export const Lounge = () => {
  const [modeView, setModeView] = useState<"Learn" | "Teach">("Learn")
  const { selectedLang, languagesToShow, setSelectedLang } =  useLangNavData(modeView)
  return (
    <>
      <IconHeader />
      <LangNav setSelectedLang={setSelectedLang} selectedLang={selectedLang} languagesToShow={languagesToShow} />
      <DropDownButton modeView={modeView} setModeView={setModeView}/>
      {modeView === "Learn" && <LearnerView modeView={modeView} selectedLang={selectedLang} />}
      {modeView === "Teach" && <TeacherView modeView={modeView} selectedLang={selectedLang} /> }
    </>
  )
}


export default Lounge


