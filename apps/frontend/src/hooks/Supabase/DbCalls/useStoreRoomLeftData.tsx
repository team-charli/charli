import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";

export const useStoreRoomLeftData = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  async function storeRoomLeftData (leftTimestamp: string, signedLeftSignature: string | null, roomRole: string, leftTimestampWorkerSig: string, session_id: number) {
    if (!signedLeftSignature) throw new Error(`no left signature`)
    if (supabaseClient && ! supabaseLoading) {
      if (roomRole === 'learner') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({learner_left_timestamp: leftTimestamp, learner_left_signature: signedLeftSignature, learner_left_timestamp_worker_sig: leftTimestampWorkerSig})
          .eq('session_id', session_id)

        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      } else if (roomRole === 'teacher') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({teacher_left_timestamp: leftTimestamp, teacher_left_signature: signedLeftSignature, teacher_left_timestamp_worker_sig: leftTimestampWorkerSig})
          .eq('session_id', session_id)
        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      }
    }
  }
  return {storeRoomLeftData};
}

