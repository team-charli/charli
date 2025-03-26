// useRoomJoin.ts
import {
  useLocalAudio,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
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
  }
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

  const { enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole
    );
  }, [options]);

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
      return await joinRoomWithRetry(roomId, huddleAccessToken);
    },
    onSuccess: async () => {
      console.log("[useRoomJoin] => joinRoomMutation => success");
    },
    onError: (error) => {
      console.error("[Huddle] Failed to join room:", error);
    },
  });

  useEffect(() => {
    if (canJoinRoom && roomJoinState === "idle" && !joinRoomMutation.isPending) {
      console.log("[useRoomJoin] => about to join...");
      joinRoomMutation.mutate();
    }
  }, [canJoinRoom, roomJoinState, joinRoomMutation]);

  useEffect(() => {
    if (roomJoinState === "connected") {
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
    }
    // Removed disableVideo/disableAudio on "left" state to avoid redundant calls
  }, [roomJoinState, enableVideo, enableAudio]);

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
    joinRoom: joinRoomMutation.mutate,
    isJoining: joinRoomMutation.isPending,
    peerIds,
    isVideoOn,
    isAudioOn,
  };
};
