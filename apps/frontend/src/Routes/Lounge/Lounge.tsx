import NonButtonLink from '../../Components/Elements/NonButtonLink'
import IconHeader from '../../Components/Headers/IconHeader'
// import LangNav from './Components/LoadLoungeData'
import DropDownButton from './Components/Interactions/DropDownButton'
import { useState } from 'react'
import useLangNavData from '../../hooks/Lounge/useLangNavData'
import LangNav from './Components/Interactions/LangNav'
import LearnerView from './Components/Learner/LearnerView'
import ScheduleView from './Components/Notifications/ScheduleView'
import TeacherView from './Components/Teacher/TeacherView'

export const Lounge = () => {
  const [modeView, setModeView] = useState<"Learn" | "Teach" | "Schedule">("Learn")
  const {selectedLang, languagesToShow, setSelectedLang } =  useLangNavData(modeView)
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

