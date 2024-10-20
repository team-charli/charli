import { useRoom } from "@huddle01/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const useRoomJoin = (roomId: string, huddleAccessToken: string | null, options: { enabled: boolean }) => {
  const queryClient = useQueryClient();
  const { joinRoom, state: roomJoinState } = useRoom({
    onLeave: () => {
      console.log('User left the room');
      queryClient.invalidateQueries({ queryKey: ['roomJoinState'] });
    }
  });

  const joinRoomMutation = useMutation({
    mutationFn: () => {
      if (!huddleAccessToken) {
        throw new Error('Huddle access token is not available');
      }
      return joinRoom({ roomId, token: huddleAccessToken });
    },
    onSuccess: (room) => {
      console.log('Successfully joined the room:', room);
      queryClient.setQueryData(['roomJoinState'], 'joined');
    },
    onError: (error) => {
      console.error('Failed to join the room:', error);
    },
  });

  useEffect(() => {
    if (options.enabled && roomJoinState === 'idle' && !joinRoomMutation.isPending) {
      joinRoomMutation.mutate();
    }
  }, [options.enabled, roomJoinState, joinRoomMutation]);

  return {
    roomJoinState,
    joinRoom: joinRoomMutation.mutate,
    isJoining: joinRoomMutation.isPending
  };
};
