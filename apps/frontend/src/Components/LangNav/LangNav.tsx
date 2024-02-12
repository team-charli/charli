import useGetLanguages from '../../hooks/Lounge/useGetLanguages';
import { LoungeProps } from '../../types/types';

const LangNav = ({ show = 'Learners' }: LoungeProps) => {
  const { wantsToLearnLangs, wantsToTeachLangs } = useGetLanguages();
  let languagesToShow: string[] = [""];

  if (show === 'Learners') {
    languagesToShow = wantsToLearnLangs;
  } else if (show === 'Teachers') {
    languagesToShow = wantsToTeachLangs;
  } else if (show === 'All') {
    // Combine and remove duplicates
    languagesToShow = [...wantsToLearnLangs, ...wantsToTeachLangs];
  }

  return (
  null
  );
};

export default LangNav;
    // <div className="flex space-x-2 overflow-x-auto py-2">
    //   {languagesToShow.map((lang, index) => (
    //     <span key={index} className="px-4 py-1 rounded-full">
    //       {lang}
    //     </span>
    //   ))}
    // </div>

