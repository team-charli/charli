import { useEffect } from 'react';
import useGetLanguages from '../../hooks/Lounge/useGetLanguages';
import { LoungeProps } from '../../types/types';

const LangNav = ({ show = 'Learners' }: LoungeProps) => {
  const { wantsToLearnLangs, wantsToTeachLangs } = useGetLanguages();
  useEffect(() => {
    if (wantsToLearnLangs.length && wantsToTeachLangs.length)
    console.log('wantsToLearnLangs', wantsToLearnLangs)
    console.log('wantsToTeachLangs', wantsToTeachLangs)
  }, [wantsToLearnLangs, wantsToTeachLangs])
  let languagesToShow: string[] = [""];

  if (show === 'Learners') {
    languagesToShow = Array.from(new Set(wantsToLearnLangs.flatMap(subArr => subArr))).filter(language => language.trim() !== "");
  } else if (show === 'Teachers') {
    languagesToShow = Array.from(new Set(wantsToTeachLangs.flatMap(subArr => subArr))).filter(language => language.trim() !== "");
  } else if (show === 'All') {
    languagesToShow = [...wantsToLearnLangs, ...wantsToTeachLangs];
  }

  return (
    <div className="flex space-x-2 overflow-x-auto py-2">
      {languagesToShow.map((lang, index) => (
        <span key={index} className="px-4 py-1  ">
          {lang}
        </span>
      ))}
    </div>
  );
};

export default LangNav;

