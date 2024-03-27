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
      .select("controller_public_key, controller_address, learner_address, requested_session_duration, controller_claim_keyid")
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error(error);
      return defaultReturn;
    }

    if (session) {
      const { controller_public_key, controller_address, learner_address, requested_session_duration, controller_claim_keyid } = session;
      return { controllerPublicKey: controller_public_key, controllerAddress: controller_address, learnerAddress: learner_address, requestedSessionDuration: requested_session_duration, keyId: controller_claim_keyid };
    }
    } catch (error) {
    console.error(error)
    return defaultReturn;
 }
  return defaultReturn;
}
