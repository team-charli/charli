import { SupabaseClient } from '@supabase/supabase-js';

export const fetchLearnersAndTeachers = async (supabaseClient: SupabaseClient | undefined, teacherId: number, learnerId: number) => {
  if (!teacherId) throw new Error('teacher_id null')
  if (!learnerId ) throw new Error('learner_id null')
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
  if (!teacherName || !learnerName) {
    throw new Error(`failed to fetch teacherName || learnerName from user_data table`);
  }

  return { teacherName, learnerName };
};
