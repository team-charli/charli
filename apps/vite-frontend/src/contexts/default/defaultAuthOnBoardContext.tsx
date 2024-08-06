import { AuthOnboardContextObj  } from '../../types/types'
export const defaultAuthContext: AuthOnboardContextObj  = {
  hasBalance: false,
  teachingLangs: [""],
  setTeachingLangs: () => void{},
  learningLangs: [""],
  setLearningLangs: () => void{},
};


