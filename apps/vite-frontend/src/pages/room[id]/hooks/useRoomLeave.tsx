// hooks/useRoomLeave.ts
import { useRoom } from '@huddle01/react/hooks';
import { useQueryClient, useMutation } from '@tanstack/react-query';

export function useRoomLeave(roomId: string) {
  const queryClient = useQueryClient();
  const { leaveRoom } = useRoom();

  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      leaveRoom();
      queryClient.setQueryData(['roomJoinState'], 'left');

    },
    onSuccess: (data) => {
      console.log('Recording stopped:', data);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  return {
    leaveRoom: leaveRoomMutation.mutate,
    isLeaving: leaveRoomMutation.isPending,
  };
}
