import IconHeader from '../Components/Headers/IconHeader'
import BannerHeader from '../Components/Headers/BannerHeader'
import ButtonLink from '../Components/Elements/ButtonLink'
import { useOnboardContext} from '../contexts/OnboardContext'

const Entry = () => {

 const {setOnboardMode} = useOnboardContext();

  return (
    <>
     <IconHeader />
     <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/login" onButtonClick={() => setOnboardMode("Learn")} >Learn 🎓 </ButtonLink>
      <ButtonLink path="/login" onButtonClick={() => setOnboardMode("Teach")}>Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry
