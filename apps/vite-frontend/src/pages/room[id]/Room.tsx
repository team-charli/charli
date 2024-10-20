import useLocalStorage from '@rehooks/local-storage';
import LocalPeer from './Components/LocalPeer';
import RemotePeer from './Components/RemotePeer';
import {useParams, useSearch} from '@tanstack/react-router';
import useBellListener from './hooks/Room/useBellListener';
import useSessionCases from './hooks/Room/useSessionCases';
import useSessionManager from './hooks/Room/useSessionManager';
import {useVerifiyRoleAndAddress} from './hooks/Room/useVerifiyRoleAndAddress';
import { useEffect } from 'react';
import { useRoomJoin } from './hooks/Room/useRoomJoin';
import { useSessionDuration } from './hooks/Room/useSessionDuration';
import { useExecuteTransferToTeacher } from './hooks/LitActionHooks/useExecuteTransferToTeacher';

const Room = () => {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, sessionId, hashedLearnerAddress, hashedTeacherAddress } = useSearch({ from: '/room/$id' });
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token');

  // 1. Verify role and address
  const { data: verifiedRoleAndAddressData, isLoading: isVerifying } = useVerifiyRoleAndAddress(hashedTeacherAddress, hashedLearnerAddress, roomRole);

  // 2. Handle session duration
  const {
    sessionDurationData,
    isBothSigned,
    isLoading: isDurationLoading,
    isError: isDurationError,
  } = useSessionDuration(sessionId);

  // 3. Join room
  const { roomJoinState, isJoining } = useRoomJoin(roomId, huddleAccessToken, {
    enabled: verifiedRoleAndAddressData && isBothSigned,
  });

  // 4. Initialize session manager
  const messages = useSessionManager({
    clientSideRoomId: roomId,
    hashedLearnerAddress,
    hashedTeacherAddress,
  });

  // 5. Get user IPFS data after joining the room
  const userIPFSData  = useSessionCases(messages);

  // 6. Execute transfer
const executeTransferMutation = useExecuteTransferToTeacher(
  userIPFSData,
  sessionDurationData?.learnerData?.sessionDuration ?? sessionDurationData?.teacherData?.sessionDuration,
  sessionDurationData?.teacherData?.teacherSignature,
  sessionDurationData?.learnerData?.learnerSignature
);

  useBellListener();

  // Logging effect
  useEffect(() => {
    console.log('Current roomJoinState:', roomJoinState);
  }, [roomJoinState]);

  if (isVerifying || isDurationLoading || isJoining || executeTransferMutation.isPending) {
    return <div>Loading...</div>;
  }

  if (isDurationError) {
    console.error('An error occurred with session duration');
  }

  return (
    <>
      <div className="__localVideo">
        <LocalPeer roomJoinState={roomJoinState} />
      </div>
      <div className="__remoteVideo">
        <RemotePeer />
      </div>
    </>
  );
};

export default Room;
