// Room.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

// Hooks
import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import { useSessionTimeTracker } from './hooks/useSessionTimeTracker';
import { useRoomJoin } from './hooks/useRoomJoin';
import { useRoomLeave } from './hooks/useRoomLeave';
import useBellListener from './hooks/useBellListener';

// UI Components
import LocalPeerView from './Components/LocalPeerView';
import RemotePeerView from './Components/RemotePeerView';
import ControlRibbon from './Components/ControlRibbon';

// If your route is /room/$id with query string
import { useParams, useSearch } from '@tanstack/react-router';

const Room = () => {
  const navigate = useNavigate();
  const { id: roomId } = useParams({ from: '/room/$id' });
  const {
    roomRole,
    hashedLearnerAddress,
    hashedTeacherAddress,
  } = useSearch({ from: '/room/$id' });
  const [remotePeerId, setRemotePeerId] = useState<string | null>(null);


  /** 1) Verify user role & address */
  const { data: verifiedRoleAndAddressData, isLoading: isVerifying } =
    useVerifiyRoleAndAddress(
      hashedTeacherAddress,
      hashedLearnerAddress,
      roomRole
    );

  /** 2) Connect to DO-based session-time-tracker */
  const {
    hasConnectedWs,
    initializationComplete,
    messages,
    isFinalized,
  } = useSessionTimeTracker({
    roomId,
    hashedTeacherAddress,
    hashedLearnerAddress,
    role: roomRole,
  });

  /** 3) Join the Huddle01 room */
  const { roomJoinState, isJoining, peerIds } = useRoomJoin(roomId, {
    verifiedRoleAndAddressData,
    hasConnectedWs,
    initializationComplete,
  });

  /** 4) If session finalizes, we leave the room and go to summary */
  const { leaveRoom } = useRoomLeave();
  useEffect(() => {
    if (isFinalized) {
      leaveRoom();
      navigate({ to: `/room-summary/${roomId}` });
    }
  }, [isFinalized, roomId, leaveRoom, navigate]);

  /** 5) Listen for ephemeral data-channel signals (like bell rings) */
  useBellListener();


  /** 6) Basic loading states */
  if (isVerifying || isJoining) {
    return <div>Loading...</div>;
  }

  // We'll consider the user "connected" if Huddle says "connected"
  const isRoomConnected = roomJoinState === 'connected';

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Main video area */}
      <div className="flex w-full h-[85%]">
        {/* Left side: local user */}
        <div className="flex-1 min-w-0 border-r border-gray-700">
          <LocalPeerView isRoomConnected={isRoomConnected} />
        </div>

        {/* Right side: remote peers */}
        <div className="flex-1 min-w-0 border-l border-gray-700">
          <RemotePeerView  />
        </div>
      </div>

      {/* Control Ribbon pinned at the bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <ControlRibbon />
      </div>
    </div>
  );
};

export default Room;
