import { SupabaseClient } from "@supabase/supabase-js";
import { convertLocalTimetoUtc } from "../../utils/app";
import { Dispatch, SetStateAction } from "react";

export async function learnerSubmitLearningRequest (supabaseClient: SupabaseClient, dateTime: string, teacherID: number, userID: string | null, teachingLang: string, setRenderSubmitConfirmation: Dispatch<SetStateAction<boolean>>) {
  const utcDateTime = convertLocalTimetoUtc(dateTime)
  try {
    const { data, error } = await supabaseClient
      .from('sessions')
      .insert([
        { teacher_id: teacherID, learner_id: userID, request_time_date:utcDateTime, request_origin_type: "learner", request_origin: userID, teaching_lang: teachingLang},
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
