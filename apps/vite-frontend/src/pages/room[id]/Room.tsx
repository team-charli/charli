// Room.tsx
import React, { useEffect } from 'react';
import { useParams, useSearch, useNavigate } from '@tanstack/react-router';

import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import { useRoomJoin } from './hooks/useRoomJoin';
import { useRoomLeave } from './hooks/useRoomLeave';

import useSessionCases from './hooks/useSessionCases';
import useBellListener from './hooks/useBellListener';
import { useSessionTimeTracker } from './hooks/useSessionTimeTracker';

const Room = () => {
  const navigate = useNavigate();
  const { id: roomId } = useParams({ from: '/room/$id' });
  const {
    roomRole,
    sessionId,
    hashedLearnerAddress,
    hashedTeacherAddress,
  } = useSearch({ from: '/room/$id' });

  // 1. Verify role and address
  const { data: verifiedRoleAndAddressData, isLoading: isVerifying, } = useVerifiyRoleAndAddress( hashedTeacherAddress, hashedLearnerAddress, roomRole);


  // 3. Connect to session-time-tracker
  const { hasConnectedWs, initializationComplete, messages, isFinalized,  } = useSessionTimeTracker({ roomId, hashedTeacherAddress, hashedLearnerAddress, role: roomRole, });

  // 4. Join Huddle01 room
  const { roomJoinState, isJoining, peerIds } = useRoomJoin(roomId, {
    verifiedRoleAndAddressData,
    hasConnectedWs,
    initializationComplete,
  });

  // 5. Once the room is finalized, we leave the Huddle01 room
  const { leaveRoom } = useRoomLeave();

  useEffect(() => {
    if (isFinalized) {
      // If session-time-tracker says the session is finalized,
      // then leave the Huddle01 room and navigate to summary
      leaveRoom(); // or you can do this inside useSessionTimeTracker if you prefer
      navigate({
        to: `/room-summary/${roomId}`,
      });
    }
  }, [isFinalized, roomId, leaveRoom, navigate]);

  // 6. Get user IPFS data after joining the room (if you still want your session logic)
  const userIPFSData = useSessionCases(messages);

  // Bells, whistles, push notifications, etc.
  useBellListener();

  // Return your main UI, or placeholders.
  // Just as an example, we show the local peer & remote peers.
  return (
    <div className="flex flex-row w-full h-screen gap-4 p-4 bg-gray-900">
      <div className="flex-1 min-w-0">
        {/* Example local peer UI */}
        <div style={{ color: 'white' }}>Local user</div>
      </div>
      <div className="flex-1 min-w-0">
        {peerIds.length > 0 ? (
          peerIds.map((remotePeerId) => (
            <div key={remotePeerId} style={{ color: 'white' }}>
              Remote Peer: {remotePeerId}
            </div>
          ))
        ) : (
            <div className="flex items-center justify-center h-full text-white">
              Waiting for remote peers...
            </div>
          )}
      </div>
    </div>
  );
};

export default Room;
