import { Session } from '@/types/types';
import { SupabaseClient } from '@supabase/supabase-js';

export const fetchLearnersAndTeachers = async (supabaseClient: SupabaseClient | undefined,  baseSession: Session) => {

  const learnerId = baseSession.learner_id;
  const teacherId = baseSession.teacher_id;

  if (!teacherId && !learnerId) throw new Error('missing learnerId or teacherId');

  let teacherName = '';
  let learnerName = '';

  if ( !supabaseClient ) throw new Error('supabaseClient is undefined')
  if (teacherId !== null) {
    try {
      const { data: teacherData, error: teacherError } = await supabaseClient
        .from('user_data')
        .select('name')
        .eq('id', teacherId)
        .single();

      if (!teacherError && teacherData) {
        teacherName = teacherData.name;
      }
    } catch(teacherError) {
      console.error(teacherError);
    }
  }

  if (learnerId !== null) {
    try {
      const { data: learnerData, error: learnerError } = await supabaseClient
        .from('user_data')
        .select('name')
        .eq('id', learnerId)
        .single();

      if (!learnerError && learnerData) {
        learnerName = learnerData.name;
      }
    } catch (learnerError) {
      console.error(learnerError)
    }
  }
  if (!teacherName && !learnerName ) {
    throw new Error(`failed to fetch teacherName or learnerName from user_data table`);
  }

  return { teacherName, learnerName };
};
