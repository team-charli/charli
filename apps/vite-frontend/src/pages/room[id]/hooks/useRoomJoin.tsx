// ~/Projects/charli/apps/vite-frontend/src/pages/room[id]/hooks/useRoomJoin.ts

import {
  useLocalAudio,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
import useLocalStorage from "@rehooks/local-storage";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

/**
 * This hook:
 * 1) Joins the Huddle room **immediately** with mic/camera off, so we can get localPeerId.
 * 2) Once joined, we remain in that “joined” state but not sending audio/video, because we never called enableAudio/enableVideo here.
 * 3) The parent can then build uploadUrl (using localPeerId) and pass it to a separate pipeline hook.
 */
export interface VerifiedRoleAndAddressData {
  verifiedRole: string | null;
  verifiedRoleAndAddress: boolean;
}

export interface UseRoomJoinOptions {
  verifiedRoleAndAddressData?: VerifiedRoleAndAddressData;
  hasConnectedWs?: boolean;
  initializationComplete?: boolean;
  // etc. if you have more flags
}

export const useRoomJoin = (
  roomId: string,
  options: UseRoomJoinOptions
) => {
  /**
   * 1) Load stored Huddle token for joining
   */
  const [huddleAccessToken] = useLocalStorage<string>("huddle-access-token");

  /**
   * 2) Setup the Huddle useRoom() hook
   */
  const {
    room,
    state: roomJoinState,
    joinRoom,
    leaveRoom: huddleLeaveRoom,
  } = useRoom({
    onJoin: ({ room }) => {
      console.log("[useRoomJoin] => onJoin => joined room:", room.roomId);
    },
    onWaiting: (data) => {
      console.warn("[useRoomJoin] => onWaiting =>", data);
    },
    onLeave: (data) => {
      console.log("[useRoomJoin] => onLeave =>", data);
    },
    onFailed: (data) => {
      console.error("[useRoomJoin] => onFailed =>", data);
    },
    onPeerJoin: (data) => {
      console.log("[useRoomJoin] => onPeerJoin => new peer:", data);
    },
    onPeerLeft: (data) => {
      console.warn("[useRoomJoin] => onPeerLeft => peer left:", data);
    },
  });

  /**
   * 3) A small helper for joining the room (with optional retries)
   */
  async function joinRoomWithRetry(roomId: string, token: string) {
    console.log("[useRoomJoin] => joinRoomWithRetry => calling joinRoom (mic off)");
    return await joinRoom({ roomId, token });
  }

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!huddleAccessToken) {
        throw new Error("No Huddle access token found");
      }
      return joinRoomWithRetry(roomId, huddleAccessToken);
    },
    onSuccess: (room) => {
      console.log("[useRoomJoin] => joined room =>", room.roomId);
    },
    onError: (err) => {
      console.error("[useRoomJoin] => failed to join:", err);
    },
  });

  /**
   * 4) Decide if we can join at all
   */
  const canJoinRoom = useMemo(() => {
    // e.g. if you have additional conditions, add them
    const ok = options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
               options.verifiedRoleAndAddressData?.verifiedRole;
    return !!ok;
  }, [options]);

  /**
   * 5) As soon as we can join, and are "idle," we do so with mic/cam off
   */
  useEffect(() => {
    if (!canJoinRoom) return;
    if (roomJoinState !== "idle") return;
    if (joinRoomMutation.isPending) return;

    console.log("[useRoomJoin] => Attempting silent join =>", roomId);
    joinRoomMutation.mutate();
  }, [canJoinRoom, roomJoinState, joinRoomMutation, roomId]);

  /**
   * 6) Local Audio & Video hooks.
   * We do NOT call enableAudio() or enableVideo() here, so we remain silent.
   * The parent or some other logic can turn them on at the right time.
   */
  const {
    stream: localAudioStream,
    isAudioOn,
    enableAudio,
    disableAudio,
  } = useLocalAudio();

  const {
    stream: localVideoStream,
    isVideoOn,
    enableVideo,
    disableVideo,
  } = useLocalVideo();

  /**
   * 7) Track peer IDs if we want
   */
  const { peerIds: allPeerIds } = usePeerIds();
  const [peerIds, setPeerIds] = useState<string[]>([]);

  useEffect(() => {
    if (roomJoinState === "connected") {
      setPeerIds(allPeerIds);
    } else {
      setPeerIds([]);
    }
  }, [roomJoinState, allPeerIds]);

  /**
   * 8) Return everything the parent might want
   */
  return {
    // ~~~~~ Huddle Info ~~~~~
    roomJoinState,
    isJoining: joinRoomMutation.isPending,
    peerIds,

    // ~~~~~ Local Tracks ~~~~~
    localAudioStream,
    isAudioOn,
    enableAudio,
    disableAudio,

    localVideoStream,
    isVideoOn,
    enableVideo,
    disableVideo,

    // in case you need to leave from here
    huddleLeaveRoom,
  };
};
