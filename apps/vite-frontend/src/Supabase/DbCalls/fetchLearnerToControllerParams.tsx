import { SupabaseClient } from "@supabase/supabase-js";
import { SessionParamsResult } from "../../types/types";

export const fetchLearnerToControllerParams = async (
  supabaseClient: SupabaseClient,
  sessionId: number
): Promise<SessionParamsResult> => {
  if (!supabaseClient) {
    throw new Error("Supabase client is not available or is loading.");
  }

  try {
    const { data: session, error: sessionError } = await supabaseClient
      .from("sessions")
      .select(`
        controller_public_key,
        controller_address,
        learner_id,
        requested_session_duration,
        requested_session_duration_learner_sig,
        controller_claim_keyid,
        hashed_learner_address,
        secure_session_id
      `)
      .eq('session_id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error("Session not found");

    const { data: userData, error: userError } = await supabaseClient
      .from('user_data')
      .select("user_address")
      .eq('id', session.learner_id)
      .single();

    if (userError) throw userError;
    if (!userData) throw new Error("User data not found");

    return {
      controllerPublicKey: session.controller_public_key,
      controllerAddress: session.controller_address,
      learnerAddress: userData.user_address,
      requestedSessionDuration: session.requested_session_duration,
      requestedSessionDurationLearnerSig: session.requested_session_duration_learner_sig,
      keyId: session.controller_claim_keyid,
      hashedLearnerAddress: session.hashed_learner_address,
      secureSessionId: session.secure_session_id
    };
  } catch (error) {
    console.error("Error fetching learner to controller params:", error);
    throw error;
  }
};
