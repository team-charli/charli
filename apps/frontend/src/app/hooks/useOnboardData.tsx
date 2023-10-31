import { useState } from "react";

export const useOnboardData= () => {

  const [onboardData, setOnboardData] = useState(null)
  const [hasOnboarded, setHasOnboarded] = useState(false)

  return { onboardData, setOnboardData,  hasOnboarded, setHasOnboarded}

}



