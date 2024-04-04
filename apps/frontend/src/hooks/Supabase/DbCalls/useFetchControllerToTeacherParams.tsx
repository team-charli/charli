//TODO: mark for deletion
import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";

interface SessionParamsResult {
}

export const useFetchControllerToTeacherParams = () => {
  const {client: supabaseClient, supabaseLoading} = useSupabase();
  const fetchControllerToTeacherParams = async (sessionId: number): Promise<SessionParamsResult> => {

    const defaultReturn: SessionParamsResult = {
    };

    if (!supabaseClient || supabaseLoading) {
      console.error("Supabase client is not available or is loading.");
      return defaultReturn;
    }

    try {
      const { data: sessionData, error } = await supabaseClient
        .from("sessions")
        .select("learner_id, teacher_id")
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error(error);
        return defaultReturn;
      }

      if (sessionData) {
        const { data: learnerData, error: learnerError } = await supabaseClient
          .from('user_data')
          .select('user_address_encrypted')
          .eq('id', sessionData.learner_id)
          .single();

        if (learnerError) console.error(learnerError);

        const { data: teacherData, error: teacherError } = await supabaseClient
          .from('user_data')
          .select('user_address_encrypted')
          .eq('id', sessionData.teacher_id)
          .single();

        if (teacherError) console.error(teacherError);

        if (learnerData && teacherData) {
          return {learner_address_encrypted: learnerData.user_address_encrypted,teacher_address_encrypted: teacherData.user_address_encrypted};
        }
      }
      return defaultReturn;
    } catch (error) {
      throw new Error(`${error}`)
    }
  }
  return {fetchControllerToTeacherParams}
}
