import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useOnboardContext } from "@/contexts/OnboardContext";
import useLitClients from "@/hooks/Lit/useLitClients";
import { litNodeClient as litNodeClientInstance, litAuthClient as litAuthClientInstance } from "@/utils/litClients";

const Entry = () => {
  useLitClients(litNodeClientInstance, litAuthClientInstance);

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

