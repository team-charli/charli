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
      <div className="flex flex-col items-center justify-center h-screen px-4 sm:px-6 md:px-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full bg-blue-200 mb-4"></div>
          <p className="mt-2 sm:mt-3 md:mt-4 text-base sm:text-lg md:text-xl text-gray-600">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full">
        <IconHeader />
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="mb-10 sm:mb-12 md:mb-16 lg:mb-20 w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto">
          <BannerHeader />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 w-full">
          <ButtonLink
            path="/login"
            onButtonClick={handleLearnClick}
            className="w-full sm:w-auto px-5 py-3 sm:py-4 text-base sm:text-lg md:text-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors rounded-lg shadow-md"
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">Learn</span>
              <span className="text-xl sm:text-2xl md:text-3xl">🎓</span>
            </span>
          </ButtonLink>
          
          <ButtonLink
            path="/login"
            onButtonClick={handleTeachClick}
            className="w-full sm:w-auto px-5 py-3 sm:py-4 text-base sm:text-lg md:text-xl bg-green-600 hover:bg-green-700 text-white transition-colors rounded-lg shadow-md"
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">Teach</span>
              <span className="text-xl sm:text-2xl md:text-3xl">🤑</span>
            </span>
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export default Entry;

