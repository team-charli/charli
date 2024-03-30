import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";
import { Database } from "apps/frontend/src/supabaseTypes";

type SessionRowSubset = {
  learner_joined_timestamp: Database['public']['Tables']['sessions']['Row']['learner_joined_timestamp'];
  learner_joined_signature: Database['public']['Tables']['sessions']['Row']['learner_joined_signature'];
  teacher_joined_timestamp: Database['public']['Tables']['sessions']['Row']['teacher_joined_timestamp'];
  teacher_joined_signature: Database['public']['Tables']['sessions']['Row']['teacher_joined_signature'];
  learner_left_timestamp: Database['public']['Tables']['sessions']['Row']['learner_left_timestamp'];
  learner_left_signature: Database['public']['Tables']['sessions']['Row']['learner_left_signature'];
  teacher_left_timestamp: Database['public']['Tables']['sessions']['Row']['teacher_left_timestamp'];
  teacher_left_signature: Database['public']['Tables']['sessions']['Row']['teacher_left_signature'];
};

export const useFetchControllerToTeacherActionData = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  async function fetchControllerToTeacherActionData(
    session_id: number
  ): Promise< SessionRowSubset | undefined> {
    if (supabaseClient && !supabaseLoading) {
      const { data, error } = await supabaseClient
        .from('sessions')
        .select('*')
        .eq('session_id', session_id)
        .single();

      if (error) {
        console.error("Error fetching session data:", error);
        return undefined;
      }

    if (data) {
      const {
        learner_joined_timestamp,
        learner_joined_signature,
        teacher_joined_timestamp,
        teacher_joined_signature,
      } = data;

      const sessionRowSubset: SessionRowSubset = {
        learner_joined_timestamp,
        learner_joined_signature,
        teacher_joined_timestamp,
        teacher_joined_signature,
      };

      return sessionRowSubset;
    }
    }

    return undefined;
  }

  return { fetchControllerToTeacherActionData };
};
