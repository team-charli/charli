// hooks/useRoomLeave.ts
import { useRoom } from '@huddle01/react';
import { useQueryClient } from '@tanstack/react-query';

export function useRoomLeave() {
  const queryClient = useQueryClient();

  // If you want direct access to the Huddle room instance:
  const { leaveRoom } = useRoom();

  // A helper that leaves and does any additional cleanup
  const handleLeave = () => {
    leaveRoom(); // Huddle’s built-in method
    queryClient.setQueryData(['roomJoinState'], 'left');
  };

  return {
    leaveRoom: handleLeave,
  };
}

