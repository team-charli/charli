import useLocalStorage from '@rehooks/local-storage';
import LocalPeer from './Components/LocalPeer';
import RemotePeer from './Components/RemotePeer';
import {useParams, useSearch} from '@tanstack/react-router';
import { useEffect } from 'react';
import { useSessionDurationStatus } from './hooks/useSessionDurationStatus';
import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import { useSessionDurationSigner } from './hooks/useSessionDurationSigner';
import useSessionManager from './hooks/useSessionManager';
import { useRoomJoin } from './hooks/useRoomJoin';
import useSessionCases from './hooks/useSessionCases';
import { useExecuteTransferToTeacher } from './hooks/useExecuteTransferToTeacher';
import useBellListener from './hooks/useBellListener';
import { useSessionSignatureProof } from './hooks/DurationProofs/useSessionSignatureProof';

const Room = () => {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, sessionId, hashedLearnerAddress, hashedTeacherAddress } = useSearch({ from: '/room/$id' });
  const [huddleAccessToken] = useLocalStorage<string>('huddle-access-token');

  // 1. Verify role and address
  const {
    data: verifiedRoleAndAddressData,
    isLoading: isVerifying
  } = useVerifiyRoleAndAddress(hashedTeacherAddress, hashedLearnerAddress, roomRole);

  useSessionSignatureProof(sessionId)


  const messages = useSessionManager({
    clientSideRoomId: roomId,
    hashedLearnerAddress,
    hashedTeacherAddress,
  });

  const { roomJoinState, isJoining } = useRoomJoin(roomId, huddleAccessToken, {
    enabled: verifiedRoleAndAddressData
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
