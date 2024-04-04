import { SupabaseClient } from "@supabase/supabase-js";
import { SessionParamsResult } from "../../types/types";

export const fetchLearnerToControllerParams = async (supabaseClient: SupabaseClient, supabaseLoading: boolean, sessionId: number): Promise<SessionParamsResult> => {

  const defaultReturn: SessionParamsResult = {
    controllerPublicKey: null,
    controllerAddress: null,
    learnerAddress: null,
    requestedSessionDuration: null,
    keyId: null
  };
  if (!supabaseClient || supabaseLoading) {
    console.error("Supabase client is not available or is loading.");
    return defaultReturn;
  }

  try {
    const { data: session, error } = await supabaseClient
      .from("sessions")
      .select("controller_public_key, controller_address, learner_id, requested_session_duration, controller_claim_keyid")
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error(error);
      return defaultReturn;
    }

    if (session) {
      const { controller_public_key, controller_address, learner_id, requested_session_duration, controller_claim_keyid } = session;
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
      return { controllerPublicKey: controller_public_key, controllerAddress: controller_address, learnerAddress: learner_address, requestedSessionDuration: requested_session_duration, keyId: controller_claim_keyid };
    }
  } catch (error) {
    console.error(error)
    return defaultReturn;
  }
  return defaultReturn;
}
