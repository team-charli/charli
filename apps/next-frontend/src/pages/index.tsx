'use client'
import { isLoadingAtom } from "@/atoms/atoms";
import { onboardModeAtom } from "@/atoms/userDataAtoms";
import ButtonLink from "@/components/elements/ButtonLink";
import BannerHeader from "@/components/headers/BannerHeader";
import IconHeader from "@/components/headers/IconHeader";
import { useAtom, useAtomValue } from "jotai";

const Entry = () => {
  const [_, setOnboardMode] = useAtom(onboardModeAtom);
  const isLoading = useAtomValue(isLoadingAtom);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mt-4 text-lg">Preparing your experience...</p>
      </div>
    );
  }

  // Your existing component logic here
  return (
    <>
      <IconHeader />
      <BannerHeader />
      <div className="flex justify-center gap-x-8 mt-64">
        <ButtonLink
          path="/login"
          onButtonClick={() => setOnboardMode("Learn")}
        >
          Learn 🎓
        </ButtonLink>
        <ButtonLink
          path="/login"
          onButtonClick={() => setOnboardMode("Teach")}
        >
          Teach 🤑
        </ButtonLink>
      </div>
    </>
  );
}

export default Entry;
