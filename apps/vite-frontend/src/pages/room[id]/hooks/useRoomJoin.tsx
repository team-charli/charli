// src/pages/room[id]/hooks/useRoomJoin.ts
import {
  useLocalAudio,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
import { useAudioPipeline } from "./useAudioPipeline";
import useLocalStorage from "@rehooks/local-storage";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export const useRoomJoin = (
  roomId: string,
  options: {
    verifiedRoleAndAddressData?: {
      verifiedRole: string | null;
      verifiedRoleAndAddress: boolean;
    };
    // e.g. hasConnectedWs, initializationComplete, etc.
  },
  uploadUrl: string | null
) => {
  const [huddleAccessToken] = useLocalStorage<string>("huddle-access-token");

  const { joinRoom, state: roomJoinState } = useRoom({
    onJoin: ({ room }) => {
      console.log("[useRoomJoin] Room joined successfully:", room);
    },
    onWaiting: (data) => {
      console.warn("[useRoomJoin] Waiting to join room:", data);
    },
    onFailed: (data) => {
      console.error("[useRoomJoin] Failed to join room:", data);
    },
    onPeerJoin: (data) => {
      console.log("[useRoomJoin] Peer joined room:", data);
    },
    onPeerLeft: (data) => {
      console.warn("[useRoomJoin] Peer left room:", data);
    },
  });

  async function joinRoomWithRetry(roomId: string, token: string) {
    console.log("[useRoomJoin] => joinRoomWithRetry => calling joinRoom");
    return await joinRoom({ roomId, token });
  }

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!huddleAccessToken) {
        throw new Error("No Huddle access token found");
      }
      return joinRoomWithRetry(roomId, huddleAccessToken);
    },
    onSuccess: () => {
      console.log("[useRoomJoin] => successfully joined");
    },
    onError: (err) => {
      console.error("[useRoomJoin] => failed to join:", err);
    },
  });

  // 1) Decide if we can attempt to join.
  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole
    );
  }, [options]);

  // 2) Manage local audio
  const {
    stream: localAudioStream,
    isAudioOn,
    enableAudio,
  } = useLocalAudio();

  // 3) Pipeline
  const { isRecording, cleanupAudio } = useAudioPipeline({
    localAudioStream,
    isAudioOn,
    uploadUrl,
  });

  // 4) Local video
  const {
    stream: localVideoStream,
    isVideoOn,
    enableVideo,
  } = useLocalVideo();

  /**
   * The main ordering effect:
   * (a) enableAudio() -> (b) pipeline starts -> (c) enableVideo() -> (d) joinRoom()
   */
  useEffect(() => {
    // Step 0: Quick debug line
    console.log(
      `[useRoomJoin] effect-check => canJoinRoom=${canJoinRoom}, roomJoinState=${roomJoinState}, isPending=${joinRoomMutation.isPending}, isAudioOn=${isAudioOn}, isRecording=${isRecording}, isVideoOn=${isVideoOn}`
    );

    // 0. Must be allowed to join
    if (!canJoinRoom) return;

    // 1. Must not already be joining/joined
    if (roomJoinState !== "idle") return;
    if (joinRoomMutation.isPending) return;

    // 2. If audio is not on yet, do that first
    if (!isAudioOn) {
      console.log("[useRoomJoin] => Step 1: enabling audio...");
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
      return;
    }

    // 3. If pipeline hasn't started recording yet, wait
    if (!isRecording) {
      console.log("[useRoomJoin] => Step 2: pipeline not recording; waiting...");
      return;
    }

    // 4. If video not on yet, enable it
    if (!isVideoOn) {
      console.log("[useRoomJoin] => Step 3: enabling video...");
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
      return;
    }

    // 5. Finally, if audio+pipeline+video are all active, join
    console.log("[useRoomJoin] => Step 4: calling joinRoom()...");
    joinRoomMutation.mutate();
  }, [
    canJoinRoom,
    roomJoinState,
    joinRoomMutation,
    isAudioOn,
    isRecording,
    isVideoOn,
    enableAudio,
    enableVideo,
  ]);

  // Track peer IDs
  const { peerIds: allPeerIds } = usePeerIds();
  const [peerIds, setPeerIds] = useState<string[]>([]);

  useEffect(() => {
    if (roomJoinState === "connected") {
      setPeerIds(allPeerIds);
    } else {
      setPeerIds([]);
    }
  }, [roomJoinState, allPeerIds]);

  return {
    roomJoinState,
    peerIds,
    localAudioStream,
    localVideoStream,
    isRecording,
    cleanupAudio,
  };
};
