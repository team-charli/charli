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
    <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-5 mr-4 sm:mr-8 md:mr-12 lg:mr-16">
      <div className="relative">
        <div className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-1 sm:mb-1.5 hidden sm:block">
          Language
        </div>
        <NativeLangMenu languages={languages} />
      </div>
    </div>
  )
}

export default NativeLanguage


