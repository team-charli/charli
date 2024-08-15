//useLearnerSubmitLearningRequest.tsx
import { useMutation } from '@tanstack/react-query';
import { convertLocalTimetoUtc } from '@/utils/app';
import { ethers, SignatureLike } from 'ethers';
import { useLitAccount, useSupabaseClient } from '@/contexts/AuthContext';

export const useLearnerSubmitLearningRequest = () => {
  const {data: currentAccount} = useLitAccount();
  const {data: supabaseClient} = useSupabaseClient();

  return useMutation({
    mutationFn: async ({
      dateTime,
      teacherID,
      userID,
      teachingLang,
      sessionDuration,
      learnerSignedSessionDuration
    }: {
      dateTime: string;
      teacherID: number;
      userID: number;
      teachingLang: string;
      sessionDuration: number;
      learnerSignedSessionDuration: SignatureLike;
    }) => {
      if (!supabaseClient || !currentAccount) {
        throw new Error('Supabase client or current account not available');
      }
      const utcDateTime = convertLocalTimetoUtc(dateTime);
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
            requested_session_duration_learner_sig: learnerSignedSessionDuration,
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
  });
};
