import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsOnboarded, useSupabaseClient } from '@/contexts/AuthContext';

const useLanguageData = (modeView: 'Learn' | 'Teach' | 'Schedule') => {
  const { data: isOnboarded } = useIsOnboarded();
  const { data: supabaseClient } = useSupabaseClient();

  const fetchLanguages = async () => {
    if (!isOnboarded || !supabaseClient) {
      return { wantsToTeachLangs: [], wantsToLearnLangs: [] };
    }

    const [responseTeachingLangs, responseLearningLangs] = await Promise.all([
      supabaseClient.from('user_data').select('wants_to_teach_langs'),
      supabaseClient.from('user_data').select('wants_to_learn_langs')
    ]);

    return {
      wantsToTeachLangs: responseTeachingLangs.data?.map((lang: any) => lang.wants_to_teach_langs || '') || [],
      wantsToLearnLangs: responseLearningLangs.data?.map((lang: any) => lang.wants_to_learn_langs || '') || []
    };
  };

  const { data: languageData, isLoading, error } = useQuery({
    queryKey: ['languages', isOnboarded, supabaseClient],
    queryFn: fetchLanguages,
    enabled: !!supabaseClient && !!isOnboarded
  });

  const languagesToShow = useMemo(() => {
    if (!languageData) return [];

    if (modeView === 'Learn') {
      return Array.from(new Set(languageData.wantsToTeachLangs.flat()));
    }
    if (modeView === 'Teach') {
      return Array.from(new Set(languageData.wantsToLearnLangs.flat()));
    }
    return [];
  }, [modeView, languageData]);

  const selectedLang = useMemo(() =>
    languagesToShow.length > 0 ? languagesToShow[0] : "",
    [languagesToShow]
  );

  return {
    wantsToTeachLangs: languageData?.wantsToTeachLangs || [],
    wantsToLearnLangs: languageData?.wantsToLearnLangs || [],
    languagesToShow,
    selectedLang,
    isLoading,
    error
  };
};

export default useLanguageData;
