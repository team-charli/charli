import { useEffect, useState } from 'react';
import useGetLanguages from './useGetLanguages';

const useLangNavData = (modeView: 'Learn' | 'Teach' | 'Schedule'  ) => {
  const { wantsToLearnLangs, wantsToTeachLangs } = useGetLanguages();
  const [ languagesToShow, setLanguagesToShow ] = useState<string[]>([]);
  const [ selectedLang, setSelectedLang ] = useState<string>("");


  useEffect(() => {
    let languages: string[] = [];
    if (modeView === 'Learn') {
      languages = Array.from(new Set(wantsToTeachLangs.flatMap(subArr =>subArr)));
    }
    if (modeView === 'Teach') {
      languages = Array.from(new Set(wantsToLearnLangs.flatMap(subArr => subArr)));
    }

    setLanguagesToShow(languages);
    if (languages.length > 0) {
      setSelectedLang(languages[0]);
    }
  }, [modeView, wantsToLearnLangs, wantsToTeachLangs]);

  return ( {selectedLang, setSelectedLang, languagesToShow });
};

export default useLangNavData;
