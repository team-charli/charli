import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";

export const useStoreLeaveData = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  async function storeLeaveData (leaveTimestamp: string, signedLeaveSignature: string | null, roomRole: string, session_id: number) {
    if (!signedLeaveSignature) throw new Error(`no leave signature`)
    if (supabaseClient && ! supabaseLoading) {
      if (roomRole === 'learner') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({learner_left_timestamp: leaveTimestamp, learner_left_signature: signedLeaveSignature})
          .eq('session_id', session_id)
        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      } else if (roomRole === 'teacher') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({teacher_left_timestamp: leaveTimestamp, teacher_left_signature: signedLeaveSignature})
          .eq('session_id', session_id)
        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      }
    }
  }
  return {storeLeaveData};

}

