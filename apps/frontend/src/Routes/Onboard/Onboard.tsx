import {useContext} from 'react'
import IconHeader from '../../Components/Headers/IconHeader'
import BannerHeader from '../../Components/Headers/BannerHeader'
import { OnboardContext } from '../../contexts/OnboardContext'
import OnboardForm from './OnboardForm'
import NonButtonLink from '../../Components/Elements/NonButtonLink'

export const Onboard = () => {
  const context = useContext(OnboardContext);
  if (!context) {
    return null;
  }
  const { onboardMode: _onboardMode } =context;


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

