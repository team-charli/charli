import { PostgrestQueryBuilder } from '@supabase/postgrest-js'
import useLocalStorage from "@rehooks/local-storage"
import { useSupabase } from "../../contexts/SupabaseContext"
import { useEffect, useState } from "react";
import { Database } from "../../supabaseTypes";

interface ScheduleDataResponse {
  session_id: number;
  confirmed_time_date: string | null;
  learner_id: { name: string }[];
  teacher_id: { name: string }[];
}

export const useGetScheduleItems = (modeView: 'Learn' | 'Teach' | 'Schedule') => {
  const [userID] = useLocalStorage("userID")
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const [learnerOriginReqs, setLearnerOriginReqs] = useState<ScheduleDataResponse[] | null >();
  const [teacherOriginReqs, setTeacherOriginReqs] = useState();

  useEffect(() => {
    async function fetchData() {
      if (modeView === 'Schedule' && supabaseClient && !supabaseLoading) {
        try {
          const { data: learnerOriginReqData, error } = await supabaseClient
          .from('sessions')
            .select(`
              session_id,
              confirmed_time_date,
              isExpired,
              learner_id (name),
              teacher_id (name)
            `)
            .eq('request_origin', 'learner')
            .eq('teacher_id', userID);
            if (!error)  {
              setLearnerOriginReqs(learnerOriginReqData);
          }
        } catch (e) {
          console.error("Error retreiving learnerOriginReqData", e)
        }
      }
    };
    fetchData();
  }, [modeView, supabaseClient, supabaseLoading])
  return {learnerOriginReqs, teacherOriginReqs}
}

