// useMediaPermissions.ts
import { useDevices } from '@huddle01/react/hooks';
import { useState, useEffect } from 'react';

export const useMediaPermissions = () => {
  const { getPermission: getCamPermission } = useDevices({ type: 'cam' });
  const { getPermission: getMicPermission } = useDevices({ type: 'mic' });

  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const requestPermissions = async () => {
    try {
      await getCamPermission();
      await getMicPermission();
      console.log('Permissions successfully requested');
      return true;  // Make sure we're returning true here
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const listenForPermissionChanges = (
    cameraPermissionStatus: PermissionStatus,
    microphonePermissionStatus: PermissionStatus,
    onPermissionsChange: () => void
  ) => {
    cameraPermissionStatus.onchange = () => {
      console.log('Camera permission changed to:', cameraPermissionStatus.state);
      onPermissionsChange();
    };

    microphonePermissionStatus.onchange = () => {
      console.log('Microphone permission changed to:', microphonePermissionStatus.state);
      onPermissionsChange();
    };
  };

  const checkPermissions = async () => {
    try {
      const { cameraPermissionStatus, microphonePermissionStatus } = await queryPermissionStatus();
      const camGranted = cameraPermissionStatus.state === 'granted';
      const micGranted = microphonePermissionStatus.state === 'granted';

      return camGranted && micGranted;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };

  const queryPermissionStatus = async () => {
    try {
      const cameraPermissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const microphonePermissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return { cameraPermissionStatus, microphonePermissionStatus };
    } catch (error) {
      console.error('Error querying permission status:', error);
      throw error;
    }
  };

  useEffect(() => {
    const initializePermissions = async () => {
      try {
        const { cameraPermissionStatus, microphonePermissionStatus } = await queryPermissionStatus();

        // Check initial permissions
        const initialCamGranted = cameraPermissionStatus.state === 'granted';
        const initialMicGranted = microphonePermissionStatus.state === 'granted';
        setPermissionsGranted(initialCamGranted && initialMicGranted);

        // Listen for changes
        listenForPermissionChanges(
          cameraPermissionStatus,
          microphonePermissionStatus,
          async () => {
            const permissionsAreGranted = await checkPermissions();
            setPermissionsGranted(permissionsAreGranted);
          }
        );
      } catch (error) {
        console.error('Error initializing permissions:', error);
      }
    };

    initializePermissions();
  }, []);

  return { requestPermissions, permissionsGranted };
};
