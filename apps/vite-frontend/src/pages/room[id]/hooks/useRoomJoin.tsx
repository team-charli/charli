// useRoomJoin.ts
import {
  useLocalAudio,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from "@huddle01/react/hooks";
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
  const [huddleAccessToken] = useLocalStorage<string>("huddle-access-token");

  // 1) The Huddle "useRoom" hook
  const { joinRoom, state: roomJoinState } = useRoom({
    onJoin: () => {
      console.log("[useRoomJoin] => onJoin callback fired");
    },
    onLeave: () => {
      console.log("[useRoomJoin] => onLeave callback fired");
    },
  });

  // 2) We'll auto-enable local video/audio once connected
  const { enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  // 3) Decide if we can join
  const canJoinRoom = useMemo(() => {
    return (
      options.verifiedRoleAndAddressData?.verifiedRoleAndAddress &&
      options.verifiedRoleAndAddressData?.verifiedRole &&
      options.hasConnectedWs &&
      options.initializationComplete
    );
  }, [options]);

  // (A) A simple function that tries joinRoom up to X times if we get
  // the "Failed to execute 'send' on 'WebSocket': Still in CONNECTING" error.
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
          continue; // try again
        }
        // Not that particular error => rethrow
        throw err;
      }
    }
    throw new Error(
      `[joinRoomWithRetry] Exceeded ${maxAttempts} attempts to join.`
    );
  }

  // 4) The actual mutation
  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!huddleAccessToken) {
        throw new Error("Huddle access token is not available");
      }
      // *Use the retry version*
      return await joinRoomWithRetry(roomId, huddleAccessToken);
    },
    onSuccess: () => {
      console.log("[useRoomJoin] => joinRoomMutation => success");
    },
    onError: (error) => {
      console.error("[Huddle] Failed to join room:", error);
    },
  });

  // 5) If all checks pass & the room is idle, auto-join (only once)
  useEffect(() => {
    if (canJoinRoom && roomJoinState === "idle" && !joinRoomMutation.isPending) {
      console.log("[useRoomJoin] => about to join...");
      joinRoomMutation.mutate();
    }
  }, [canJoinRoom, roomJoinState, joinRoomMutation]);

  // 6) Produce local media once connected
  useEffect(() => {
    if (roomJoinState === "connected") {
      enableVideo().catch((err) => console.error("enableVideo() failed:", err));
      enableAudio().catch((err) => console.error("enableAudio() failed:", err));
    } else if (roomJoinState === "left" || roomJoinState === "idle") {
      disableVideo();
      disableAudio();
    }
  }, [roomJoinState, enableVideo, enableAudio, disableVideo, disableAudio]);

  // 7) Peer IDs
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
