import useLocalStorage from '@rehooks/local-storage';
import { useEffect } from 'react';

export const useOnboardMode = (isOnboarded: boolean | null) => {
  const [onboardMode, setOnboardMode] = useLocalStorage<"Learn" | "Teach" | null>('onboardMode', null);
  useEffect(() => {
    if (isOnboarded){
      setOnboardMode(null)
    }
   [onboardMode]})

  return {onboardMode, setOnboardMode}
}
