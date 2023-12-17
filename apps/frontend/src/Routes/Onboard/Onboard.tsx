import IconHeader from '../../Components/Headers/IconHeader'
import BannerHeader from '../../Components/Headers/BannerHeader'
import { useContextNullCheck } from '../../hooks/utils/useContextNullCheck'
import { OnboardContext } from '../../contexts/OnboardContext'
import OnboardForm from './OnboardForm'
import NonButtonLink from '../../Components/Elements/NonButtonLink'

export const Onboard = () => {
  const { onboardMode: _onboardMode } = useContextNullCheck(OnboardContext, "onboardMode");
  let fakeButton, form

  if (_onboardMode && _onboardMode  === "Learn") {
    fakeButton = <NonButtonLink> Learn 🎓</NonButtonLink>
    form = <OnboardForm onboardMode={_onboardMode}/ >
  } else if (_onboardMode && _onboardMode  === "Teach"){
    fakeButton = <NonButtonLink>Teach 🤑</NonButtonLink>
    form = <OnboardForm onboardMode={_onboardMode}/ >
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

//FIX: Have to login in repeatedly.  Maybe not reading the localstorage
