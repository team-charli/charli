import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAuthOnboardContext } from "@/contexts";

const Entry = () => {
  const { setOnboardMode } = useAuthOnboardContext();
  return (
    <>
     <IconHeader />
     <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/login" onButtonClick={() => {/*console.log('setOnboardMode Learn');*/ return setOnboardMode("Learn")}} >Learn 🎓 </ButtonLink>
      <ButtonLink path="/login" onButtonClick={() => {/*console.log("setOnboardMode Teach");*/setOnboardMode("Teach")}}>Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry

