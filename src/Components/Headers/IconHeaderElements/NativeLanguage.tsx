import { useEffect, useState } from 'react'
import { deduplicateLanguages } from '../../../utils/app'
import NativeLangMenu from './NativeLangMenu'
import {ErrorModal} from '../../../Components/Errors/ErrorModal'

const NativeLanguage = () => {
  const [languages, setLanguages] = useState<string[]>([])
  useEffect(() => {
  const deduplicatedLanguages = deduplicateLanguages([...navigator.languages]);
  if (deduplicatedLanguages.length === 0) {
      throw new Error('languages array empty');
    }
    setLanguages(deduplicateLanguages([...navigator.languages]))
  }, [])

  return (
    <NativeLangMenu languages={languages} />
  )
}

export default NativeLanguage


