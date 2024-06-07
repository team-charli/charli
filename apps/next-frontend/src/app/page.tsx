'use client';

import { litNodeClient as litNodeClientInstance, litAuthClient as litAuthClientInstance } from "@/utils/litClients";
import IconHeader from "./Components/IconHeader";
import BannerHeader from "./Components/headers/BannerHeader";
import ButtonLink from "./Components/elements/ButtonLink";
import { useState } from "react";

const Entry = () => {
  const [onboardMode, setOnboardMode] = useState<string>();
  return (
    <>
     <IconHeader />
     <BannerHeader />
      <div className=" _button-container_ flex justify-center gap-x-8 mt-64">
      <ButtonLink path="/login" onButtonClick={() => { setOnboardMode("Learn")}} >Learn 🎓 </ButtonLink>
      <ButtonLink path="/login" onButtonClick={() => {setOnboardMode("Teach")}}>Teach 🤑</ButtonLink>
      </div>
    </>
  );
}

export default Entry

