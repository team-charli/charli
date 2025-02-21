// Room.tsx
import React, { useEffect } from 'react';
import {
  useRoom,
  useLocalVideo,
  useLocalAudio,
  usePeerIds,
  useLocalPeer,
} from '@huddle01/react/hooks';
import LocalPeerView from './Components/LocalPeerView';
import RemotePeerView from './Components/RemotePeerView';
import useLocalStorage from '@rehooks/local-storage';
import { useParams } from '@tanstack/react-router';

export default function Room() {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token');

  const { joinRoom, state } = useRoom({
    onJoin: (data) => {
      try {
        console.log(
          '[Room] onJoin => joined room =>',
          data.room.roomId,
          '\nFull `data`:\n',
          JSON.stringify(data, null, 2)
        );
      } catch (err) {
        console.log('[Room] onJoin => data stringify error =>', err);
      }
    },
    onPeerJoin: (peer) => {
      try {
        console.log(
          '[Room] onPeerJoin => peer:\n',
          JSON.stringify(peer, (key, val) => {
            // Remove the cyclical references or huge items if needed
            if (key.startsWith('__')) return undefined;
            return val;
          }, 2)
        );
      } catch (err) {
        console.log('[Room] onPeerJoin => error =>', err);
      }
    },
    onFailed: (err) => {
      console.error('[Room] onFailed =>', err.status, err.message);
    },
  });

  const { enableVideo, disableVideo, isVideoOn } = useLocalVideo();
  const { enableAudio, disableAudio, isAudioOn } = useLocalAudio();

  // Get local and remote peer IDs
  const { peerId: localPeerId } = useLocalPeer();
  const { peerIds } = usePeerIds();
  const remotePeerIds = peerIds.filter((id) => id !== localPeerId);

  useEffect(() => {
    // Log out peer info on every render
    try {
      console.log(`[Room] localPeerId => ${localPeerId || 'null'}`);
      console.log(`[Room] all peerIds => ${JSON.stringify(peerIds, null, 2)}`);
      console.log(
        `[Room] remotePeerIds => ${JSON.stringify(remotePeerIds, null, 2)}`
      );
    } catch (err) {
      console.log('[Room] peerIds stringify error =>', err);
    }
  }, [localPeerId, peerIds, remotePeerIds]);

  async function handleToggleVideo() {
    if (isVideoOn) await disableVideo();
    else await enableVideo();
  }
  async function handleToggleAudio() {
    if (isAudioOn) await disableAudio();
    else await enableAudio();
  }

  return (
    <main className="flex flex-col min-h-screen bg-gray-900 text-white">
      {/* Top bar with state */}
      <div className="p-4 flex gap-4 items-center border-b border-gray-600">
        <p className="font-bold">Room State: {state}</p>

        {state === 'idle' && (
          <button
            className="bg-blue-500 px-3 py-1 rounded"
            onClick={() => {
              if (roomId && huddleAccessToken) {
                joinRoom({ roomId, token: huddleAccessToken })
                  .then(() => {
                    console.log('[Room] joinRoom() success');
                  })
                  .catch((err) => {
                    console.error('[Room] manual join error =>', err);
                  });
              } else {
                console.warn(
                  '[Room] Missing either roomId or huddleAccessToken',
                  roomId,
                  huddleAccessToken
                );
              }
            }}
          >
            Join Room
          </button>
        )}

        {state === 'connected' && (
          <>
            <button
              className="bg-blue-500 px-3 py-1 rounded"
              onClick={handleToggleVideo}
            >
              {isVideoOn ? 'Disable Video' : 'Enable Video'}
            </button>
            <button
              className="bg-blue-500 px-3 py-1 rounded"
              onClick={handleToggleAudio}
            >
              {isAudioOn ? 'Disable Audio' : 'Enable Audio'}
            </button>
          </>
        )}
      </div>

      {/* Local user on left, remote peers on right */}
      <div className="flex-1 flex">
        <div className="flex-1 border-r border-gray-700">
          <LocalPeerView />
        </div>

        <div className="flex-1 border-l border-gray-700 p-4 flex flex-col gap-4">
          {remotePeerIds.length === 0 ? (
            <div className="text-center text-gray-400">
              No remote peers in the room
            </div>
          ) : (
            remotePeerIds.map((id) => <RemotePeerView key={id} peerId={id} />)
          )}
        </div>
      </div>
    </main>
  );
}
