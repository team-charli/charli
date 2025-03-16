import { useEffect } from 'react';
import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import { useSessionTimeTracker } from './hooks/useSessionTimeTracker';
import { useRoomJoin } from './hooks/useRoomJoin';
import { useRoomLeave } from './hooks/useRoomLeave';
import useBellListener from './hooks/useBellListener';
import { useLocalPeer } from '@huddle01/react/hooks';
import LocalPeerView from './Components/LocalPeerView';
import RemotePeerView from './Components/RemotePeerView';
import ControlRibbon from './Components/ControlRibbon';
import { useParams, useSearch, useNavigate} from '@tanstack/react-router';

const Room = () => {
  const navigate = useNavigate();
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, hashedLearnerAddress, hashedTeacherAddress, controllerAddress } =
  useSearch({ from: '/room/$id' });

  // 1) Verify user role & address
  const { data: verifiedRoleAndAddressData /*, isLoading: isVerifying */ } =
  useVerifiyRoleAndAddress(hashedTeacherAddress, hashedLearnerAddress, roomRole);

  // 2) Connect to DO-based session-time-tracker
  const { hasConnectedWs, initializationComplete, isFinalized } = useSessionTimeTracker( roomId, hashedLearnerAddress, hashedTeacherAddress, controllerAddress);

  // 3) Join the Huddle01 room
  const { roomJoinState, /* isJoining, */ peerIds } = useRoomJoin(roomId, { verifiedRoleAndAddressData, hasConnectedWs, initializationComplete });

  // 4) If session finalizes, leave room and go to summary
  const { leaveRoom } = useRoomLeave(roomId);

  useEffect(() => {
    if (isFinalized) {
      leaveRoom();
      navigate({ to: `/session-history` });
    }
  }, [isFinalized, roomId, leaveRoom, navigate]);

  // 5) Listen for ephemeral data-channel signals (like bell rings)
  useBellListener();

  // 6) Pull localPeerId at the top — no early returns
  const { peerId: localPeerId } = useLocalPeer();

  // 7) We'll consider user "connected" if Huddle’s `state` is "connected"
  const isRoomConnected = roomJoinState === 'connected';

  // 8) Filter out our own local peer
  const remotePeerIds = peerIds.filter((id) => id !== localPeerId);

  // 9) Render full UI (no loading screen)
  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Main video area */}
      <div className="flex w-full h-[85%]">
        {/* Left side: local user */}
        <div className="flex-1 min-w-0 border-r border-gray-700">
          {/* Pass the "isRoomConnected" to show local camera if we want */}
          <LocalPeerView isRoomConnected={isRoomConnected} />
        </div>

        {/* Right side: remote peers */}
        <div className="flex-1 min-w-0 border-l border-gray-700 p-4 flex flex-col gap-4">
          {remotePeerIds.length === 0 ? (
            <div className="text-center text-white">
              Waiting for remote peer...
            </div>
          ) : (
              remotePeerIds.map((id) => (
                <RemotePeerView key={id} peerId={id} />
              ))
            )}
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
