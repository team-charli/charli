import { useState, useEffect } from 'react'

export const useOnboardMode = () => {
  const [onboardMode, setOnboardMode] = useState<"Learn" | "Teach" | null>(
    () => {
    const storedOnboardMode = localStorage.getItem('onboardMode');
    return storedOnboardMode ? storedOnboardMode as "Learn" | "Teach" : null;
  }
  );
  useEffect(() => {
    if (onboardMode !== null) {

      localStorage.setItem('onboardMode', onboardMode);
    }
  }, [onboardMode]);

  return {onboardMode, setOnboardMode}
}
