import { useState, useEffect } from 'react'

export const useOnboardMode = () => {
  const [onboardMode, setOnboardMode] = useState<"Learn" | "Teach" | null>(
    // null
    () => {
    const storedOnboardMode = localStorage.getItem('onboardMode');
    return storedOnboardMode ? storedOnboardMode as "Learn" | "Teach" : null;
  }
  );
  useEffect(() => {
    console.log({onboardMode});
    if (onboardMode !== null) {
      localStorage.setItem('onboardMode', onboardMode);
    }
  }, [onboardMode]);

  return {onboardMode, setOnboardMode}
}
