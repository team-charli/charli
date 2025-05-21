// useCheckSlotAvailability.tsx
import { useMutation } from '@tanstack/react-query';
import { useSupabaseClient } from '@/contexts/AuthContext';

interface CheckSlotParams {
  teacherId: number;
  learnerId: number;
  proposedTime: string; // ISO date string
  durationMinutes: number;
}

export const useCheckSlotAvailability = () => {
  const { data: supabaseClient } = useSupabaseClient();

  return useMutation({
    mutationFn: async ({ teacherId, learnerId, proposedTime, durationMinutes }: CheckSlotParams) => {
      if (!supabaseClient) throw new Error('Supabase client not available');
      
      const { data, error } = await supabaseClient.functions.invoke('check-slot-availability', {
        body: JSON.stringify({
          teacherId,
          learnerId,
          proposedTime,
          durationMinutes,
        }),
      });

      if (error) throw new Error(`Slot availability check failed: ${error.message}`);
      
      return data.conflict as boolean;
    },
  });
};