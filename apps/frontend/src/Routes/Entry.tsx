import IconHeader from '../Components/Headers/IconHeader'
import BannerHeader from '../Components/Headers/BannerHeader'
import ButtonLink from '../Components/Elements/ButtonLink'
import {OnboardContext} from '../contexts/OnboardContext'
import { useContextNullCheck } from '../hooks/utils/useContextNullCheck'

const Entry = () => {
  const {setOnboardMode} = useContextNullCheck(OnboardContext);

  return (
    <>
    <IconHeader />
    <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/lounge" onButtonClick={() => setOnboardMode("Learn")} >Learn 🎓 </ButtonLink>
      <ButtonLink path="/lounge" onButtonClick={() => setOnboardMode("Teach")}>Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry
