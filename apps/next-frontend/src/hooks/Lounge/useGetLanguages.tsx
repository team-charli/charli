import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabase } from '../../contexts/SupabaseContext';
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

const useGetLanguages = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  const [isOnboarded] = useLocalStorage<boolean>("isOnboarded")

  const [wantsToTeachLangs, setWantsToTeachLangs] = useState<string[]>([]);
  const [wantsToLearnLangs, setWantsToLearnLangs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (isOnboarded && supabaseClient && !supabaseLoading) {
          // console.log('superbaseClient', Boolean(supabaseClient));
          const responseTeachingLangs = await supabaseClient
            .from('user_data')
            .select('wants_to_teach_langs');
          if (responseTeachingLangs.data) {
            setWantsToTeachLangs((responseTeachingLangs.data as any).map((lang: any) => lang.wants_to_teach_langs || ''));
          } else {
            console.log("no response data");
          }

          const responseLearningLangs = await supabaseClient
            .from('user_data')
            .select('wants_to_learn_langs');


          if (responseLearningLangs.data) {
            setWantsToLearnLangs((responseLearningLangs.data as any).map((lang: any) => lang.wants_to_learn_langs || ''));
          } else {
            console.log("no response data");

          }
        } else {
          // console.log('{superbaseClient, supabaseLoading', {superbaseClient: Boolean(supabaseClient), supebaseLoading: Boolean(supabaseLoading) })
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error('An error occurred'));
      } finally {
        setIsLoading(false);
      }
    };

    void (async () => {
      await fetchData();
    })();
  }, [supabaseClient, supabaseLoading, currentAccount, sessionSigs, isOnboarded/*, isOnline*/]);

  return {
    wantsToTeachLangs,
    wantsToLearnLangs,
    isLoading,
    error,
  };
};

export default useGetLanguages;
