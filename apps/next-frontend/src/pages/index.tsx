'use client'
import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAuthOnboardContext } from "@/contexts";
import { litNodeClient } from "@/utils/litClients";
import { useEffect } from "react";

const Entry = () => {
  const { setOnboardMode } = useAuthOnboardContext();
  useEffect(() => {
    void (async () => {
      await litNodeClient.connect()
      console.log('litNodeClient.ready', litNodeClient.ready)
    })();
  }, [litNodeClient])
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

