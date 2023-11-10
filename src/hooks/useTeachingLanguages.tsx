import {useState, Dispatch, SetStateAction} from 'react'

export function useTeachingLanguages():[string[], Dispatch<SetStateAction<string[]>>] {

  const [teachingLangs, setTeachingLangs] = useState([] as string[])


  return [teachingLangs, setTeachingLangs]
}
