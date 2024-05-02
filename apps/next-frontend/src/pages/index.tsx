import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAuthOnboardContext } from "@/contexts";
import { useOnboardContext } from "@/contexts/OnboardContext";
import useLitClients from "@/hooks/Lit/useLitClients";
import { litNodeClient as litNodeClientInstance, litAuthClient as litAuthClientInstance } from "@/utils/litClients";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Entry = () => {
  const router = useRouter();
  useLitClients(litNodeClientInstance, litAuthClientInstance);
  const {isLitLoggedIn} = useAuthOnboardContext();
  const {setOnboardMode, isOnboarded} = useOnboardContext();
  return (
    <>
     <IconHeader />
     <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/login" onButtonClick={() => {console.log('setOnboardMode Learn'); return setOnboardMode("Learn")}} >Learn 🎓 </ButtonLink>
      <ButtonLink path="/login" onButtonClick={() => {console.log("setOnboardMode Teach"); setOnboardMode("Teach")}}>Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry

