import NonButtonLink from '../../Components/Elements/NonButtonLink'
import IconHeader from '../../Components/Headers/IconHeader'
import LangNav from '../../Components/LangNav/LangNav'
import useTraceRerenders from '../../hooks/utils/useTraceUpdate'
import { LoungeProps } from '../../types/types'

export const Lounge = ({show = 'Learners'}: LoungeProps) => {
  const buttonTextMap = {
    Learners: 'Learn 🎓',
    Teachers: 'Teach 🤑',
    All: 'Everyone 🏫',
  };
  const buttonText = buttonTextMap[show];

  return (
    <>
      <IconHeader />
      <LangNav show={show}/>
      <div className="__non-button-container__ flex justify-center m-10">
        <NonButtonLink>{buttonText}</NonButtonLink>
      </div>
    </>
  )
}

export default Lounge

