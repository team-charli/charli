import { AuthOnboardContextObj  } from '../../types/types'
export const defaultAuthContext: AuthOnboardContextObj  = {
  authMethod: null,
  authLoading: false,
  accountsLoading: false,
  sessionLoading: false,
  authError: undefined,
  accountsError: undefined,
  sessionError: undefined,
  isLitLoggedIn: false,
  onboardMode: null,
  setOnboardMode: () => void {},
  isOnboarded: false,
  setIsOnboarded: () => void {},
  hasBalance: false,
  nativeLang: "",
  setNativeLang: () => void{},
  name: "",
  setName: () => void{},
  teachingLangs: [""],
  setTeachingLangs: () => void{},
  learningLangs: [""],
  setLearningLangs: () => void{},
};


