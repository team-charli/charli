import IconHeader from '../../Components/Headers/IconHeader'
import BannerHeader from '../../Components/Headers/BannerHeader'
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
  const { onboardMode: _onboardMode } = useContextNullCheck(StateContext, "onboardMode");
  console.log('_onboardMode:', _onboardMode)
  let fakeButton, form

  if (_onboardMode && _onboardMode  === "Learn") {
    fakeButton = <NonButtonLink> Learn 🎓</NonButtonLink>
    form = <OnboardForm onboardMode={_onboardMode} currentAccount={currentAccount} / >
  } else if (_onboardMode && _onboardMode  === "Teach"){
    fakeButton = <NonButtonLink>Teach 🤑</NonButtonLink>
    form = <OnboardForm onboardMode={_onboardMode} currentAccount={currentAccount} / >
  } else {
    fakeButton =  <NonButtonLink></NonButtonLink>
    form = null;
  }

  return (

    <>
    <IconHeader />
    <BannerHeader />
      <div className="__non-button-container__ flex justify-center m-10">
      {fakeButton}
      </div>
      {form}
    </>
  )
}
export default Onboard;
