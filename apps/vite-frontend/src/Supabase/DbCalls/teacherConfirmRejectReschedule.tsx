import { IRelayPKP } from "@lit-protocol/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Dispatch, SetStateAction } from "react";

export async function teacherConfirmRequestDb ( supabaseClient: SupabaseClient | null | undefined, setUiMode: Dispatch<SetStateAction<'initial' | 'confirmed' | 'rejectOptions'| 'changingTime'>>, utcDateTime: string, session_id: number, currentAccount: IRelayPKP | null | undefined, hashedTeacherAddress: string | undefined, requestedSessionDurationLearnerSig: string, requestedSessionDurationTeacherSig: string, ciphertext: string, dataToEncryptHash: string) {
  if (supabaseClient && currentAccount && hashedTeacherAddress) {
    try {
      console.log('insert confirmed_time_date: utcDateTime to be inserted', utcDateTime )

      const { error } = await supabaseClient
        .from('sessions')
        .update({'confirmed_time_date': utcDateTime, 'hashed_teacher_address': hashedTeacherAddress, 'requested_session_duration_learner_sig': requestedSessionDurationLearnerSig, 'requested_session_duration_teacher_sig': requestedSessionDurationTeacherSig, 'teacher_address_cipher_text': ciphertext, teacher_address_encrypt_hash: dataToEncryptHash })
        .match({session_id})
        .select();
      if (!error) {
        console.log("session confimred in db")
        setUiMode('confirmed');
      } else {
        console.error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting data', error);
    }
  }
}
export async function teacherRejectRequest(supabaseClient: SupabaseClient | null| undefined, reason: string) {
  if (supabaseClient) {
    try {
      const {data, error} = await supabaseClient
        .from('sessions')
        .update({session_rejected_reason: reason})
        .select();
      if (!error) {
        console.log('Submission successful', data);
      } else {
        console.error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting data', error);
    }
  }
}

export async function teacherChangeDateTime(supabaseClient: SupabaseClient | null | undefined, dateTime: string) {
  const dateObj = new Date(dateTime)
  const utcDateTime = dateObj.toISOString();
  if (supabaseClient) {
    try {
      const {data, error} = await supabaseClient
        .from('sessions')
        .update({ counter_time_date: utcDateTime })
        .select();
      if (!error) {
        console.log('Submission successful', data);
      } else {
        console.error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting data', error);
    }
  }
}
