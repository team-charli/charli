// hooks/useRoomLeave.ts
import { useRoom } from '@huddle01/react/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';

export function useRoomLeave(roomId: string) {
  const queryClient = useQueryClient();
  const { leaveRoom } = useRoom({
    onLeave: (data) => {
      console.warn("[useRoomLeave] Room closed or left:", data);
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      console.warn("[useRoomLeave] leaveRoom explicitly called (mutationFn)");
      leaveRoom();
      queryClient.setQueryData(['roomJoinState'], 'left');
    },
    onSuccess: () => { // Removed `data` parameter since `leaveRoom()` doesn’t return anything meaningful
      console.log('[useRoomLeave] leaveRoom mutation succeeded');
    },
    onError: (error) => {
      console.error('[useRoomLeave] Error leaving room:', error);
    },
  });

  return {
    leaveRoom: leaveRoomMutation.mutate,
    isLeaving: leaveRoomMutation.isPending,
  };
}
