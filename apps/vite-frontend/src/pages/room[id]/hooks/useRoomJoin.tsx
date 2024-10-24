// useRoomJoin.ts
import { useRoom, usePeerIds } from "@huddle01/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useRoomJoin = (
  roomId: string,
  huddleAccessToken: string | null,
  options: {
    verifiedRoleAndAddressData: {
      verifiedRole: string | null;
      verifiedRoleAndAddress: boolean;
    } | undefined;
    processedDurationProof: boolean;
    hasConnectedWs: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const { joinRoom, state: roomJoinState } = useRoom({
    onJoin: () => {
      console.log('[Huddle] Room joined:', {
        role: options.verifiedRoleAndAddressData?.verifiedRole,
        state: 'connected',
      });
      queryClient.setQueryData(['roomJoinState'], 'connected');
    },
    onLeave: () => {
      console.log('[Huddle] Room left');
      queryClient.setQueryData(['roomJoinState'], 'left');
    },
  });

  useEffect(() => {
    console.log('[Huddle] Room state:', roomJoinState);
  }, [roomJoinState]);

  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole &&
      options.processedDurationProof &&
      options.hasConnectedWs
    );
  }, [options]);

  const joinRoomMutation = useMutation({
    mutationFn: () => {
      if (!huddleAccessToken) {
        throw new Error('Huddle access token is not available');
      }
      // Pass role and metadata when joining
      return joinRoom({
        roomId,
        token: huddleAccessToken,
        metadata: JSON.stringify({
          role: options.verifiedRoleAndAddressData?.verifiedRole,
          isVerified: options.verifiedRoleAndAddressData?.verifiedRoleAndAddress,
        }),
      });
    },
    onSuccess: (room) => {
      console.log('[Huddle] Successfully joined room:', {
        role: options.verifiedRoleAndAddressData?.verifiedRole,
        room: room.roomId,
      });
      queryClient.setQueryData(['roomJoinState'], 'joined');
    },
    onError: (error) => {
      console.error('[Huddle] Failed to join room:', error);
    },
  });

  useEffect(() => {
    if (canJoinRoom && roomJoinState === 'idle' && !joinRoomMutation.isPending) {
      joinRoomMutation.mutate();
    }
  }, [canJoinRoom, roomJoinState, joinRoomMutation]);

  // Call usePeerIds unconditionally at the top level
  const { peerIds: allPeerIds } = usePeerIds();

  // State to hold peer IDs after room is connected
  const [peerIds, setPeerIds] = useState<string[]>([]);

  // Update peerIds when room is connected and allPeerIds change
  useEffect(() => {
    if (roomJoinState === 'connected') {
      setPeerIds(allPeerIds);
    } else {
      setPeerIds([]);
    }
  }, [roomJoinState, allPeerIds]);

  return {
    roomJoinState,
    joinRoom: joinRoomMutation.mutate,
    isJoining: joinRoomMutation.isPending,
    peerIds,
  };
};
