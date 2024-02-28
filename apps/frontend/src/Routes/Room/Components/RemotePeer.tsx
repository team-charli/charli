import React, { useState, useEffect } from 'react';
import { usePeerIds, useRemoteVideo, useRemoteAudio } from '@huddle01/react/hooks';
import { Audio, Video } from '@huddle01/react/dist/components';

const RemotePeer = () => {
  const { peerIds } = usePeerIds({ roles: ['guest'] });
  const [peerId, setPeerId] = useState('');

  // Update peerId state when peerIds is fetched
  useEffect(() => {
    if (peerIds.length > 0) {
      setPeerId(peerIds[0]);
    }
  }, [peerIds]);

  const { stream: videoStream, state: videoState } = useRemoteVideo({ peerId });
  const { stream: audioStream, state: audioState } = useRemoteAudio({ peerId });

  const hasPeerData = peerId && videoState === 'playable' && videoStream && audioState === 'playable' && audioStream;

  return (
    <div>
      {hasPeerData ? (
        <>
          <Video stream={videoStream} />
          <Audio stream={audioStream} />
        </>
      ) : (
        <div>No Remote Peer</div>
      )}
    </div>
  );
};

export default RemotePeer;
