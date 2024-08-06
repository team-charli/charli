import { SupabaseClient } from "@supabase/supabase-js";
import { SessionParamsResult } from "../../types/types";

export const fetchLearnerToControllerParams = async (supabaseClient: SupabaseClient, sessionId: number): Promise<SessionParamsResult> => {

  const defaultReturn: SessionParamsResult = {
    controllerPublicKey: null,
    controllerAddress: null,
    learnerAddress: null,
    requestedSessionDuration: null,
    requestedSessionDurationLearnerSig: null,
    keyId: null,
    hashedLearnerAddress: null
  };
  if (!supabaseClient) {
    console.error("Supabase client is not available or is loading.");
    return defaultReturn;
  }

  try {
    const { data: session, error } = await supabaseClient
      .from("sessions")
      .select("controller_public_key, controller_address, learner_id, requested_session_duration, requested_session_duration_learner_sig, controller_claim_keyid, hashed_learner_address")
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error(error);
      return defaultReturn;
    }

    if (session) {
      const { controller_public_key, controller_address, learner_id, requested_session_duration, controller_claim_keyid, requested_session_duration_learner_sig, hashed_learner_address } = session;
      let learner_address;
      try {
        const {data: userData, error: learnerAddressError} = await supabaseClient
          .from('user_data')
          .select("user_address")
          .eq('id', learner_id)
          .single();
        if (learnerAddressError || !userData) console.error(learnerAddressError);
        if (!userData) throw new Error(`userData.learner_address not returned`)
        learner_address = userData.user_address;
      } catch (learnerAddressError) {
        console.error(error);
        throw new Error(`Error fetching learner_address`)
      }
      return { controllerPublicKey: controller_public_key, controllerAddress: controller_address, learnerAddress: learner_address, requestedSessionDuration: requested_session_duration, requestedSessionDurationLearnerSig: requested_session_duration_learner_sig, keyId: controller_claim_keyid, hashedLearnerAddress: hashed_learner_address};

    }
  } catch (error) {
    console.error(error)
    return defaultReturn;
  }
  return defaultReturn;
}
