//fetchLearnerToControllerParams.tsx
import { SupabaseClient } from "@supabase/supabase-js";
import { SessionParamsResult } from "../../types/types";

export const fetchLearnerToControllerParams = async (
  supabaseClient: SupabaseClient | undefined,
  sessionId: number
): Promise<SessionParamsResult> => {
  if (!supabaseClient) {
    throw new Error("Supabase client is not available or is loading.");
  }

  try {
    const { data: session, error: sessionError } = await supabaseClient
      .from('sessions')
      .select(`
        controller_address,
        requested_session_duration,
        requested_session_duration_learner_sig,
        hashed_learner_address,
        secure_session_id,
        learner_address_encrypt_hash,
        learner_address_cipher_text,
        session_duration_data
      `)
      .eq('session_id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error("Session not found");


    return {
      controllerAddress: session.controller_address,
      requestedSessionDuration: session.requested_session_duration,
      requestedSessionDurationLearnerSig: session.requested_session_duration_learner_sig,
      hashedLearnerAddress: session.hashed_learner_address,
      secureSessionId: session.secure_session_id,
      learnerAddressEncryptHash: session.learner_address_encrypt_hash,
      learnerAddressCipherText: session.learner_address_cipher_text,
      sessionDurationData: session.session_duration_data
    };
  } catch (error) {
    console.error("Error fetching learner to controller params:", error);
    throw error;
  }
};
