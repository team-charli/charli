//Entry.tsx
import { onboardModeAtom } from "@/atoms/atoms";
import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useLitAccount, useLitAuthMethod, useSessionSigs } from "@/contexts/AuthContext";
import { useAtom } from "jotai";
import React from 'react';

const Entry = () => {

  const [_, setOnboardMode] = useAtom(onboardModeAtom);
  const litAuthMethod = useLitAuthMethod();
  const litAccount = useLitAccount();
  const sessionSigs = useSessionSigs();

  const isLoading = litAuthMethod.isLoading || litAccount.isLoading || sessionSigs.isLoading;
  //const error = litAuthMethod.error || litAccount.error || sessionSigs.error;

  const handleLearnClick: React.MouseEventHandler<HTMLAnchorElement> = () => {
    // console.log("Learn button clicked");
    setOnboardMode("Learn");
  };

  const handleTeachClick: React.MouseEventHandler<any> = () => {
    console.log("Teach button clicked");
    setOnboardMode("Teach");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mt-4 text-lg">Preparing your experience...</p>
      </div>
    );
  }

  return (
    <>
      <IconHeader />
      <BannerHeader />
      <div className="flex justify-center gap-x-8 mt-64">
        <ButtonLink
          path="/login"
          onButtonClick={handleLearnClick}
        >
          Learn 🎓
        </ButtonLink>
        <ButtonLink
          path="/login"
          onButtonClick={handleTeachClick}
        >
          Teach 🤑
        </ButtonLink>
      </div>
    </>
  );
}

export default Entry;

