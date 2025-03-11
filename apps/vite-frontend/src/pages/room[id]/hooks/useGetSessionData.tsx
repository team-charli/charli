//useGetSessionDurationData.tsx
import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from "@/contexts/AuthContext";

export const useGetSessionData = (roomId: string) => {
  const { data: supabaseClient } = useSupabaseClient();

  return useQuery({
    queryKey: ['durationSigs', roomId],
    queryFn: async () => {
      if (!supabaseClient) throw new Error('missing supabaseClient');

      const { data, error } = await supabaseClient.from('sessions')
        .select('requested_session_duration_learner_sig, requested_session_duration_teacher_sig, requested_session_duration, session_duration_data, secure_session_id, teacher_address_encrypt_hash, teacher_address_cipher_text, learner_address_cipher_text, learner_address_encrypt_hash')
        .eq('huddle_room_id', roomId);

      if (error) {
        console.error(error);
        throw new Error('error in useGetDurationSigs');
      }

      const session = data[0];
      const {
        requested_session_duration_learner_sig: requestedSessionDurationLearnerSig,
        requested_session_duration_teacher_sig: requestedSessionDurationTeacherSig,
        session_duration_data: sessionDurationData,
        requested_session_duration: requestedSessionDuration,
        secure_session_id: secureSessionId,
        teacher_address_encrypt_hash: teacherAddressEncryptHash,
        teacher_address_cipher_text: teacherAddressCiphertext,
        learner_address_cipher_text: learnerAddressCiphertext,
        learner_address_encrypt_hash: learnerAddressEncryptHash
      } = session || {};
    console.log('session', session)
      return {
        requestedSessionDurationLearnerSig,
        requestedSessionDurationTeacherSig,
        requestedSessionDuration,
        sessionDurationData,
        secureSessionId,
        teacherAddressEncryptHash,
        teacherAddressCiphertext,
        learnerAddressCiphertext,
        learnerAddressEncryptHash

      };
    }
  });
};
