import { useRoom } from "@huddle01/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export const useRoomJoin = (
  roomId: string,
  huddleAccessToken: string | null,
  options: {
    verifiedRoleAndAddressData: {
      verifiedRole: string | null;
      verifiedRoleAndAddress: boolean;
    } | undefined,
    processedDurationProof: boolean,
    hasConnectedWs: boolean
  }
) => {
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

  const canJoinRoom = useMemo(() => {
    return !!(
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole &&
      options.processedDurationProof
      // &&  options.hasConnectedWs
    );
  }, [options.verifiedRoleAndAddressData, options.processedDurationProof, /*options.hasConnectedWs*/]);

  useEffect(() => {
    if (canJoinRoom && roomJoinState === 'idle' && !joinRoomMutation.isPending) {
      joinRoomMutation.mutate();
    }
  }, [canJoinRoom, roomJoinState, joinRoomMutation]);

  return {
    roomJoinState,
    joinRoom: joinRoomMutation.mutate,
    isJoining: joinRoomMutation.isPending
  };
};
