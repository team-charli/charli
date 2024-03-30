import ethers from 'ethers';
import { IRelayPKP } from "@lit-protocol/types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Dispatch, SetStateAction } from "react";

export async function teacherConfirmRequestDb ( supabaseClient: SupabaseClient | null, setUiMode: Dispatch<SetStateAction<'initial' | 'confirmed' | 'rejectOptions'| 'changingTime'>>, dateTime: string, session_id: number, currentAccount: IRelayPKP | null) {
  if (supabaseClient && currentAccount) {
    try {
      const dateObj = new Date(dateTime)
      const utcDateTime = dateObj.toISOString();
      const hashed_teacher_address = ethers.keccak256(currentAccount.ethAddress);

      const { data, error } = await supabaseClient
        .from('sessions')
        .update({'confirmed_time_date': utcDateTime, hashed_teacher_address})
        .match({session_id})
        .select();
      if (!error) {
        setUiMode('confirmed');
      } else {
        console.error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting data', error);
    }
  }
}
export async function teacherRejectRequest(supabaseClient: SupabaseClient | null, reason: string) {
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

export async function teacherChangeDateTime(supabaseClient: SupabaseClient | null, dateTime: string) {
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
