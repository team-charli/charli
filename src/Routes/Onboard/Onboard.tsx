import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { StateContext } from '../../contexts/StateContext'
import { IRelayPKP, SessionSigs  } from '@lit-protocol/types';
import OnboardForm from './OnboardForm'
import NonButtonLink from '../../Components/Elements/NonButtonLink'
interface OnboardPropTypes {
  currentAccount: IRelayPKP;
  sessionSigs: SessionSigs;
}

export const Onboard = ({currentAccount}: OnboardPropTypes) => {
  const {onBoard: {onboardMode} } = useContextNullCheck(StateContext)

  return (
    <>
      <div className="__non-button-container__ flex justify-center m-10">
      {onboardMode && onboardMode  === "Learn" ? <NonButtonLink> Learn 🎓</NonButtonLink> : <NonButtonLink>Teach 🤑</NonButtonLink> }
        </div>
      <OnboardForm onboardMode={onboardMode} currentAccount={currentAccount} />
    </>
  )
}
export default Onboard;
