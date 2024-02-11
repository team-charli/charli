import useLocalStorage from '@rehooks/local-storage';

export const useOnboardMode = () => {
  const [onboardMode, setOnboardMode] = useLocalStorage<"Learn" | "Teach" | null>('onboardMode');

  return {onboardMode, setOnboardMode}
}
