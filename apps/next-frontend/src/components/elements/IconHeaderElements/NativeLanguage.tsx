import { useEffect, useState } from 'react'
import { deduplicateLanguages } from '../../../utils/app'
import NativeLangMenu from './NativeLangMenu'

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
    <div className="mt-5 mr-16">
      <NativeLangMenu languages={languages} />
    </div>
  )
}

export default NativeLanguage


