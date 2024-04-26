import ethers from 'ethers';
import { SupabaseClient } from "@supabase/supabase-js";
import { convertLocalTimetoUtc } from "../../utils/app";
import { Dispatch, SetStateAction } from "react";
import { IRelayPKP } from '@lit-protocol/types';

export async function learnerSubmitLearningRequest (supabaseClient: SupabaseClient, dateTime: string, teacherID: number, userID: string | null, teachingLang: string, setRenderSubmitConfirmation: Dispatch<SetStateAction<boolean>>, requested_session_duration: number, controller_address: string, controller_claim_userId: string, controller_public_key: string, claim_key_id: string, currentAccount: IRelayPKP | null) {
  const utcDateTime = convertLocalTimetoUtc(dateTime)
  try {
    let hashed_learner_address;
    if (currentAccount) {
      hashed_learner_address = ethers.keccak256(currentAccount.ethAddress);
    }
    const { data, error } = await supabaseClient
      .from('sessions')
      .insert([
        { teacher_id: teacherID, learner_id: userID, request_time_date:utcDateTime, request_origin_type: "learner", request_origin: userID, teaching_lang: teachingLang, requested_session_duration, controller_address, controller_claim_userId, controller_public_key, controller_claim_keyid: claim_key_id, hashed_learner_address},
      ])
      .select()
    if (!error) {
      console.log('Submission successful', data);
      setRenderSubmitConfirmation(true);
      return true;
    } else {
      console.error('Submission failed');
      return false;
    }
  } catch (error) {
    console.error('Error submitting data', error);
  }
}
