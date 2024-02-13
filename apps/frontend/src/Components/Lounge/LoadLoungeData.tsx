import { useEffect, useState } from 'react';
import useGetLanguages from '../../hooks/Lounge/useGetLanguages';
import { LoungeProps } from '../../types/types';
import LangNav from './LangNav';

const LoadLoungeData = ({ show = 'Learners' }: LoungeProps) => {
  const { wantsToLearnLangs, wantsToTeachLangs } = useGetLanguages();
  const [languagesToShow, setLanguagesToShow] = useState<string[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>("");

  useEffect(() => {
    let languages: string[] = [];
    if (show === 'Learners') {
      languages = Array.from(new Set(wantsToLearnLangs.flatMap(subArr => subArr))).filter(language => language.trim() !== "");
    } else if (show === 'Teachers') {
      languages = Array.from(new Set(wantsToTeachLangs.flatMap(subArr => subArr))).filter(language => language.trim() !== "");
    } else if (show === 'All') {
      languages = Array.from(new Set([...wantsToLearnLangs.flatMap(subArr => subArr), ...wantsToTeachLangs.flatMap(subArr => subArr)])).filter(language => language.trim() !== "");
    }

    setLanguagesToShow(languages);
    // Set the first language as selected by default
    if (languages.length > 0) {
      setSelectedLang(languages[0]);
    }
  }, [show, wantsToLearnLangs, wantsToTeachLangs]);

  return (
    <LangNav setSelectedLang={setSelectedLang} selectedLang={selectedLang} languagesToShow={languagesToShow} />
  );
};

export default LoadLoungeData;
