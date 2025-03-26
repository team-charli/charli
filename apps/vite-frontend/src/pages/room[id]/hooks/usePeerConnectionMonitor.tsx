import { useEffect } from 'react';
import { useRoom } from '@huddle01/react/hooks';

export function useComprehensiveHuddleMonitor(localAudioStream: MediaStream | null) {
  const { room, state } = useRoom({
    onJoin: ({ room }) => {
      console.log('[HuddleMonitor] Joined room:', room.roomId, room.sessionId);
    },
    onLeave: (data) => {
      console.warn('[HuddleMonitor] Room left:', data);
    },
    onFailed: (data) => {
      console.error('[HuddleMonitor] Failed to join room:', data);
    },
    onWaiting: (data) => {
      console.warn('[HuddleMonitor] Waiting event:', data);
    },
    onPeerJoin: (data) => {
      console.log('[HuddleMonitor] Peer joined:', data);
    },
    onPeerLeft: (data) => {
      console.warn('[HuddleMonitor] Peer left:', data);
    },
  });

  useEffect(() => {
    if (!room) return;

    const logState = () => {
      console.log('[HuddleMonitor] Room state:', room.state);
    };

    const logActiveSpeakers = ({ peerIds, dominantSpeaker }: any) => {
      console.log('[HuddleMonitor] Active speakers changed:', { peerIds, dominantSpeaker });
    };

    const logStreamClosed = (data: any) => {
      console.warn('[HuddleMonitor] Stream closed:', data);
    };

    //room.on('active-speakers-change', logActiveSpeakers);
    room.on('room-controls-updated', logState);
    room.on('stream-closed', logStreamClosed);

    return () => {
      room.off('active-speakers-change', logActiveSpeakers);
      room.off('room-controls-updated', logState);
      room.off('stream-closed', logStreamClosed);
    };
  }, [room, state]);

  useEffect(() => {
    if (!localAudioStream) {
      console.warn('[HuddleMonitor] No localAudioStream available');
      return;
    }

    const track = localAudioStream.getAudioTracks()[0];
    if (!track) {
      console.warn('[HuddleMonitor] No audio track found');
      return;
    }

    const logTrackEvent = (event: string) => {
      console.warn(`[HuddleMonitor] Audio track event: ${event}`, {
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
      });
    };

    track.onended = () => logTrackEvent('ended');
    track.onmute = () => logTrackEvent('mute');
    track.onunmute = () => logTrackEvent('unmute');

    const interval = setInterval(() => {
      console.debug('[HuddleMonitor] Periodic audio track status:', {
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
      });
    }, 5000);

    return () => {
      clearInterval(interval);
      track.onended = null;
      track.onmute = null;
      track.onunmute = null;
    };
  }, [localAudioStream]);
}
