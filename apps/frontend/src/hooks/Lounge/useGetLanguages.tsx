import { useEffect, useState } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import { useSupabase } from '../../contexts/SupabaseContext';
// import { useNetwork } from '../../contexts/NetworkContext'; // Uncomment if network status is needed
import { IRelayPKP, SessionSigs } from '@lit-protocol/types';

const useGetLanguages = () => {
  // console.log("useGetLanguages");

  const { client: supabaseClient, supabaseLoading } = useSupabase();
  const [currentAccount] = useLocalStorage<IRelayPKP>('currentAccount');
  const [sessionSigs] = useLocalStorage<SessionSigs>('sessionSigs');
  // const { isOnline } = useNetwork(); // Uncomment if network status is checked

  const [wantsToTeachLangs, setWantsToTeachLangs] = useState<string[]>([]);
  const [wantsToLearnLangs, setWantsToLearnLangs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (supabaseClient && !supabaseLoading /* && isOnline */) {
          const responseTeachingLangs = await supabaseClient
            .from('user_data')
            .select('wants_to_teach_langs');
          if (responseTeachingLangs.data) {
            setWantsToTeachLangs(responseTeachingLangs.data.map(lang => lang.wants_to_teach_langs || ''));
          } else {
            console.log("no response data");
          }

          const responseLearningLangs = await supabaseClient
            .from('user_data')
            .select('wants_to_learn_langs');


          if (responseLearningLangs.data) {
            setWantsToLearnLangs(responseLearningLangs.data.map(lang => lang.wants_to_learn_langs || ''));
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

    fetchData();
    // const debug = async () => {
    //   if (supabaseClient && !supabaseLoading /* && isOnline */) {
    //     try {
// let { data: user_data, error } = await supabaseClient
  // .from('user_data')
  // .select('*')
    //       console.log("data", user_data)
    //     } catch (e) {
    //       console.error(e);
    //     }
    //   }
    // }
    // debug();
  }, [supabaseClient, supabaseLoading, currentAccount, sessionSigs /*, isOnline*/]);

  return {
    wantsToTeachLangs,
    wantsToLearnLangs,
    isLoading,
    error,
  };
};

export default useGetLanguages;
