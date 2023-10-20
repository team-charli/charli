import {useState, useEffect} from 'react'

export function useIsTeacher() {

  const [isTeacher, setIsTeacher] = useState(false)

  useEffect(() => {
    //TODO: check teaching langs

    let teachingLangs //CODE = api call, NOTE: need db ids connected to auth -> need id system
    teachingLangs = [''];  // placeholder
    if (teachingLangs.length > 0) {
      setIsTeacher(true)
    } else {
      setIsTeacher(false)
    }
  })

  return isTeacher
}

