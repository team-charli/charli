// useRoomJoin.ts
import { useRoom, usePeerIds, useLocalVideo, useLocalAudio } from "@huddle01/react";
import useLocalStorage from "@rehooks/local-storage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useRoomJoin = (
  roomId: string,
  options: {
    verifiedRoleAndAddressData: {
      verifiedRole: string | null;
      verifiedRoleAndAddress: boolean;
    } | undefined;
    hasConnectedWs: boolean;
    initializationComplete: boolean;
  }
) => {
  const queryClient = useQueryClient();
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token');

  // 1) The standard Huddle "useRoom"
  const { joinRoom, state: roomJoinState } = useRoom({
    onJoin: () => {
      queryClient.setQueryData(['roomJoinState'], 'connected');
    },
    onLeave: () => {
      queryClient.setQueryData(['roomJoinState'], 'left');
    },
  });

  // 2) For local video/audio
  const { enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  useEffect(() => {
    // console.log('[Huddle] Room state:', roomJoinState);
  }, [roomJoinState]);

  // If all conditions are met, we can "joinRoom"
  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole &&
      options.hasConnectedWs &&
      options.initializationComplete
    );
  }, [options]);

  // 3) Actually call joinRoom
  const joinRoomMutation = useMutation({
    mutationFn: () => {
      if (!huddleAccessToken) {
        throw new Error('Huddle access token is not available');
      }
      return joinRoom({ roomId, token: huddleAccessToken });
    },
    onSuccess: () => {
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

  // 4) After user is "connected," enable local media automatically
  useEffect(() => {
    if (roomJoinState === 'connected') {
      enableVideo().catch((err) => console.error('enableVideo() failed:', err));
      enableAudio().catch((err) => console.error('enableAudio() failed:', err));
    } else if (roomJoinState === 'left') {
      disableVideo();
      disableAudio();
    }
  }, [
    roomJoinState,
    enableVideo,
    enableAudio,
    disableVideo,
    disableAudio,
  ]);

  // 5) If you need peer IDs
  const { peerIds: allPeerIds } = usePeerIds();
  const [peerIds, setPeerIds] = useState<string[]>([]);

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
    isVideoOn,
    isAudioOn,
  };
};
