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
    verifiedRoleAndAddressData: {
      verifiedRole: string | null;
      verifiedRoleAndAddress: boolean;
    } | undefined;
  },
  uploadUrl: string
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

  async function joinRoomWithRetry(
    roomId: string,
    token: string,
    maxAttempts: number = 5,
    delayMs: number = 400
  ) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`[joinRoomWithRetry] Attempt #${attempt}`);
        return await joinRoom({ roomId, token });
      } catch (err: any) {
        const msg = err?.message || "";
        if (msg.includes("Still in CONNECTING state")) {
          console.warn(
            `[joinRoomWithRetry] STILL CONNECTING => retry in ${delayMs} ms...`
          );
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }
    throw new Error(
      `[joinRoomWithRetry] Exceeded ${maxAttempts} attempts to join.`
    );
  }

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!huddleAccessToken) {
        throw new Error("Huddle access token is not available");
      }
      return joinRoomWithRetry(roomId, huddleAccessToken);
    },
    onSuccess: async () => {
      console.log("[useRoomJoin] => joinRoomMutation => success");
    },
    onError: (error) => {
      console.error("[Huddle] Failed to join room:", error);
    },
  });

  // Determine if we can attempt to join the room
  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
        options.verifiedRoleAndAddressData?.verifiedRole
    );
  }, [options]);

  // Initialize audio pipeline as soon as localAudioStream is available
  // and `enableAudio()` has been called. This ensures the pipeline
  // is ready by the time we join the room.
  const {
    stream: localAudioStream,
    isAudioOn,
    isProducing,
    enableAudio,
  } = useLocalAudio();

  const { isRecording } = useAudioPipeline({
    localAudioStream,
    isAudioOn,
    isProducing,
    uploadUrl,
  });

  // We also still want local video; let's handle that once we've joined the room
  const { enableVideo, isVideoOn } = useLocalVideo();

  /**
   * Main effect that triggers our join flow:
   * 1) We can join the room => call enableAudio() if we haven't already.
   * 2) As soon as the pipeline is recording => do joinRoom.
   */
  useEffect(() => {
    // We'll only do something if we haven't joined yet and can join
    if (!canJoinRoom) return;
    if (roomJoinState !== "idle") return; // "idle" means we haven't tried to join
    if (joinRoomMutation.isPending) return;

    // If we haven't turned on local audio, do so:
    if (!isAudioOn) {
      console.log("[useRoomJoin] => enabling audio before join...");
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
      return; // Wait until next render to see if we have stream
    }

    // If pipeline is active ("recording"), we can now safely join the room
    if (isRecording) {
      console.log("[useRoomJoin] => pipeline is recording => now joinRoom...");
      joinRoomMutation.mutate();
    }
  }, [
      canJoinRoom,
      roomJoinState,
      joinRoomMutation,
      enableAudio,
      isAudioOn,
      isRecording,
    ]);

  const { peerIds: allPeerIds } = usePeerIds();
  const [peerIds, setPeerIds] = useState<string[]>([]);

  useEffect(() => {
    if (roomJoinState === "connected") {
      setPeerIds(allPeerIds);
    } else {
      setPeerIds([]);
    }
  }, [roomJoinState, allPeerIds]);

  // Once connected, we can enableVideo() if you want video automatically
  useEffect(() => {
    if (roomJoinState === "connected" && !isVideoOn) {
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
    }
  }, [roomJoinState, isVideoOn, enableVideo]);

  return {
    roomJoinState,
    joinRoom: joinRoomMutation.mutate,
    isJoining: joinRoomMutation.isPending,
    peerIds,
    isVideoOn,
    isAudioOn,
  };
};
