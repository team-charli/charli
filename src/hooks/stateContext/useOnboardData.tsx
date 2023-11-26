import { useState } from "react";
import { ContextObj } from '../../types/types'
export const useOnboardData= () => {

  const [onboardData, setOnboardData] = useState<ContextObj | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [onboardMode, setOnboardMode] = useState<"Learn" | "Teach" | null>(null);

  return { onboardMode, setOnboardMode, onboardData, setOnboardData,  hasOnboarded, setHasOnboarded}

}



