import { SupabaseClient } from "@supabase/supabase-js";
import { Dispatch, SetStateAction } from "react";

export async function teacherConfirmRequest (action: string, supabaseClient: SupabaseClient, setUiMode: Dispatch<SetStateAction<'initial' | 'confirmed' | 'noOptions'| 'changingTime'>>, dateTime: string ) {
  try {
    const dateObj = new Date(dateTime)
    const utcDateTime = dateObj.toISOString();
    const { data, error } = await supabaseClient
      .from('sessions')
      .update({'confirmed_time_date': utcDateTime })
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

export async function teacherRejectRequest(supabaseClient: SupabaseClient, reason: string) {
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

export async function teacherChangeDateTime(supabaseClient: SupabaseClient, dateTime: string) {
  const dateObj = new Date(dateTime)
  const utcDateTime = dateObj.toISOString();

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
