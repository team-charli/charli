import { useSupabase } from "apps/frontend/src/contexts/SupabaseContext";

export const useSignJoinData = () => {
  const { client: supabaseClient, supabaseLoading } = useSupabase();
  async function storeJoinData (joinedTimestamp: string, signedJoinSignature: string | null, roomRole: string, session_id: number) {
    if (!signedJoinSignature) throw new Error(`no join signature`)
    if (supabaseClient && ! supabaseLoading) {
      if (roomRole === 'learner') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({learner_joined_timestamp: joinedTimestamp, learner_joined_signature: signedJoinSignature})
          .eq('session_id', session_id)

        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      } else if (roomRole === 'teacher') {
        try {
          const {data, error} = await supabaseClient
          .from('sessions')
          .update({teacher_joined_timestamp: joinedTimestamp, teacher_joined_signature: signedJoinSignature})
          .eq('session_id', session_id)
        } catch (error) {
          console.error(error);
          throw new Error(`${error}`)
        }
      }
    }
  }
  return {storeJoinData};

}
