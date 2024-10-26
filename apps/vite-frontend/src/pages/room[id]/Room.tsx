// Room.tsx
import React, { useState, useEffect } from 'react';
import useLocalStorage from '@rehooks/local-storage';
import LocalPeer from './Components/LocalPeer';
import RemotePeer from './Components/RemotePeer';
import { useParams, useSearch } from '@tanstack/react-router';
import { useVerifiyRoleAndAddress } from './hooks/useVerifiyRoleAndAddress';
import useSessionManager from './hooks/useSessionManager';
import { useRoomJoin } from './hooks/useRoomJoin';
import useSessionCases from './hooks/useSessionCases';
import useBellListener from './hooks/useBellListener';
import { useSessionSignatureProof } from './hooks/DurationProofs/useSessionSignatureProof';

const Room = () => {
  const { id: roomId } = useParams({ from: '/room/$id' });
  const { roomRole, sessionId, hashedLearnerAddress, hashedTeacherAddress } = useSearch({ from: '/room/$id' });


  // 1. Verify role and address
  const {
    data: verifiedRoleAndAddressData,
    isLoading: isVerifying,
  } = useVerifiyRoleAndAddress(hashedTeacherAddress, hashedLearnerAddress, roomRole);

  // 2. Sign sessionDuration proof
  const { isProcessing, processedDurationProof } = useSessionSignatureProof(sessionId);

  // 3. connect ws
  const { messages, hasConnectedWs } = useSessionManager({
    clientSideRoomId: roomId,
    hashedLearnerAddress,
    hashedTeacherAddress,
  });

  // 4. Join Room
  const { roomJoinState, isJoining, peerIds} = useRoomJoin(
    roomId,
    {
      verifiedRoleAndAddressData,
      processedDurationProof,
      hasConnectedWs,
    }
  );

  // 5. Get user IPFS data after joining the room
  const userIPFSData = useSessionCases(messages);

  useBellListener();

  if (isVerifying || isProcessing || isJoining) {
    return <div>Loading...</div>;
  }

return (
null
);
}

export default Room;

  // <div className="flex flex-row w-full h-screen gap-4 p-4 bg-gray-900">
  //   <div className="flex-1 min-w-0">
  //     <LocalPeer roomJoinState={roomJoinState} />
  //   </div>
  //   <div className="flex-1 min-w-0">
  //     {peerIds.length > 0 ? (
  //       peerIds.map((remotePeerId) => (
  //         <RemotePeer key={remotePeerId} remotePeerId={remotePeerId} />
  //       ))
  //     ) : (
  //       <div className="flex items-center justify-center h-full text-white">
  //         Waiting for remote peers...
  //       </div>
  //     )}
  //   </div>
  // </div>

