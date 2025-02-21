// useRoomJoin.ts
import { useEffect, useState } from 'react';
import {
  useLocalAudio,
  useLocalVideo,
  usePeerIds,
  useRoom,
} from '@huddle01/react/hooks';
import useLocalStorage from '@rehooks/local-storage';

export function useRoomJoin() {
  // 1) "my-communication-dapp" style: just destructure from `useRoom`
  const { joinRoom: libraryJoinRoom, state: roomJoinState } = useRoom({
    onJoin: (data) => {
      console.log('[useRoomJoin] onJoin => joined room:', data.room.roomId);
    },
    onWaiting: (data) => {
      console.warn('[useRoomJoin] onWaiting =>', data.reason, data.message);
    },
    onFailed: (err) => {
      console.error('[useRoomJoin] onFailed =>', err.status, err.message);
    },
    onPeerJoin: (peerId) => {
      console.log('[useRoomJoin] onPeerJoin => peerId:', peerId);
    },
    onPeerLeft: (peerId) => {
      console.log('[useRoomJoin] onPeerLeft => peerId:', peerId);
    },
  });

  // 2) Local audio/video
  const { enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  // 3) A function named exactly `joinRoom(...)` that calls the library’s `joinRoom`
  async function joinRoom(params: { roomId: string; token: string }) {
    console.log('[useRoomJoin] joinRoom => calling libraryJoinRoom with:', params);
    try {
      await libraryJoinRoom(params);
      console.log('[useRoomJoin] joinRoom => success');
    } catch (err) {
      console.error('[useRoomJoin] joinRoom => error:', err);
    }
  }

  // 4) Toggles
  async function toggleVideo() {
    if (roomJoinState !== 'connected') {
      console.warn('[useRoomJoin] toggleVideo => not connected');
      return;
    }
    if (isVideoOn) {
      console.log('[useRoomJoin] toggleVideo => disabling video...');
      await disableVideo();
    } else {
      console.log('[useRoomJoin] toggleVideo => enabling video...');
      await enableVideo();
    }
  }

  async function toggleAudio() {
    if (roomJoinState !== 'connected') {
      console.warn('[useRoomJoin] toggleAudio => not connected');
      return;
    }
    if (isAudioOn) {
      console.log('[useRoomJoin] toggleAudio => disabling audio...');
      await disableAudio();
    } else {
      console.log('[useRoomJoin] toggleAudio => enabling audio...');
      await enableAudio();
    }
  }

  // 5) Peer IDs
  const { peerIds: allPeerIds } = usePeerIds();
  const [peerIds, setPeerIds] = useState<string[]>([]);

  useEffect(() => {
    if (roomJoinState === 'connected') {
      setPeerIds(allPeerIds);
    } else {
      setPeerIds([]);
    }
  }, [roomJoinState, allPeerIds]);

  // 6) Return
  return {
    // The same "my-communication-dapp" naming
    joinRoom,
    roomJoinState,
    isVideoOn,
    isAudioOn,
    toggleVideo,
    toggleAudio,
    peerIds,
  };
}
