import { UseQueryResult } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { litAccountAtom } from '@/atoms/atoms';
import { convertLocalTimetoUtc } from '@/utils/app';
import { ethers, SignatureLike } from 'ethers';
import { useSupabaseQuery } from '@/hooks/Supabase/useSupabaseQuery';

export const useLearnerSubmitLearningRequest = (
  dateTime: string,
  teacherID: number,
  userID: string | null,
  teachingLang: string,
  sessionDuration: number | null,
  requestedSessionDurationLearnerSig: SignatureLike | undefined
): UseQueryResult<boolean, Error> => {
  const currentAccount = useAtomValue(litAccountAtom);
  const utcDateTime = convertLocalTimetoUtc(dateTime);

  return useSupabaseQuery<boolean, Error>(
    ['learnerSubmitLearningRequest', dateTime, teacherID, userID, teachingLang, sessionDuration, requestedSessionDurationLearnerSig],
    async (supabaseClient) => {
      if (!supabaseClient || !currentAccount) {
        throw new Error('Supabase client or current account not available');
      }

      let hashed_learner_address = ethers.keccak256(currentAccount.ethAddress);

      const { data, error } = await supabaseClient
        .from('sessions')
        .insert([
          {
            teacher_id: teacherID,
            learner_id: userID,
            request_time_date: utcDateTime,
            request_origin_type: "learner",
            request_origin: userID,
            teaching_lang: teachingLang,
            requested_session_duration: sessionDuration,
            hashed_learner_address,
            requested_session_duration_learner_sig: requestedSessionDurationLearnerSig,
          },
        ])
        .select();

      if (error) {
        console.error('Submission failed', error);
        throw error;
      }

      console.log('Submission successful', data);
      return true;
    },
    {
      enabled: !!currentAccount && !!userID && !!sessionDuration && !!requestedSessionDurationLearnerSig,
    }
  );
};

