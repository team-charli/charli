import { useState } from "react";
import { OnboardData } from '../contexts/StateContext'
export const useOnboardData= () => {

  const [onboardData, setOnboardData] = useState<OnboardData | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [onboardMode, setOnboardMode] = useState<"Learn" | "Teach" | null>(null);

  return { onboardMode, setOnboardMode, onboardData, setOnboardData,  hasOnboarded, setHasOnboarded}

}



