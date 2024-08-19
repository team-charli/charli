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
      learnerSignedSessionDuration,
      secureSessionId,
      controller_claim_user_id,
      controller_public_key,
      claim_key_id,
    }: {
      dateTime: string;
      teacherID: number;
      userID: number;
      teachingLang: string;
      sessionDuration: number;
      learnerSignedSessionDuration: SignatureLike;
      secureSessionId: string;
      controller_claim_user_id: string;
      controller_public_key: string;
      claim_key_id: string
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
            secure_session_id: secureSessionId,
            controller_claim_user_id,
            controller_public_key,
            controller_claim_keyid: claim_key_id,

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
