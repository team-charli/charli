import NonButtonLink from '../../Components/Elements/NonButtonLink'
import IconHeader from '../../Components/Headers/IconHeader'
// import LangNav from './Components/LoadLoungeData'
import DropDownButton from './Components/DropDownButton'
import { useState } from 'react'
import useLangNavData from '../../hooks/Lounge/useLangNavData'
import LangNav from './Components/LangNav'
import LearnerView from './Components/LearnerView'
import ScheduleView from './Components/ScheduleView'
import TeacherView from './Components/TeacherView'

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
      {modeView === "Schedule" && <ScheduleView modeView={modeView}/>}
    </>
  )
}


export default Lounge

