// types.ts

export type WebhookEvents = {
  'meeting:started': [
  data: {
    sessionId: string;
    roomId: string;
    createdAt: number;
  }
];
  'meeting:ended': [
  data: {
    sessionId: string;
    roomId: string;
    createdAt: number;
    endedAt: number;
    duration: number;
    participants: number;
    maxParticipants: number;
  }
];
  'peer:joined': [
  data: {
    id: string;
    sessionId: string;
    roomId: string;
    joinedAt: number;
    metadata?: string;
    role?: string;
    browser: {
      name?: string;
      version?: string;
    };
    device: {
      model?: string;
      type?: string;
      vendor?: string;
    };
  }
];
  'peer:left': [
  data: {
    id: string;
    sessionId: string;
    roomId: string;
    leftAt: number;
    duration: number;
    metadata?: string;
    role?: string;
  }
];
};

export type WebhookData = {
  id: string;
  event: keyof WebhookEvents;
  payload: WebhookEvents[keyof WebhookEvents][0];
};


export interface User {
  role: 'teacher' | 'learner' | null;
  peerId: string | null;
  roomId: string | null;
  joinedAt: number | null;
  leftAt: number | null;
  faultTime?: number;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  sessionDuration: number;
}

export interface UserFinalRecord extends User {
  sessionSuccess: boolean;
  faultType: string | null;
  sessionComplete: boolean;
  isFault: boolean | null;
}

export type ClientData = {
  clientSideRoomId: string;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  userAddress: string;
  teacherAddressCiphertext: string;
  teacherAddressEncryptHash: string;
  learnerAddressCiphertext: string;
  learnerAddressEncryptHash: string;
  controllerAddress: string;
  secureSessionId: string;
  requestedSessionDurationLearnerSig: string;
  requestedSessionDurationTeacherSig: string;
  sessionDurationData: string;
  sessionDuration: number;
}

export interface Message {
  type: 'fault' | 'userJoined' | 'userLeft' | 'bothJoined' | 'bothLeft' | 'userData' | 'initiated' | 'warning' | 'expired';
  data: {
    faultType?: string;
    user?: User;
    timestamp?: number;
    teacher?: User | null;
    learner?: User | null;
    message?: string;
    timestampMs?: string;
  };
}

export interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

export interface DOToEdgeRequest {
  // IPFS hash of the session data written by DO
  sessionDataIpfsHash: string;
  // Type of finalization (fault or success)
  finalizationType: 'fault' | 'non_fault';
  // Additional fault data if applicable
  faultData?: {
    faultType: string;
    faultedRole: 'teacher' | 'learner';
  };
  // Room ID for correlation/logging
  roomId: string;
}

export interface EdgeFunctionResponse {
  success?: boolean;
  // Transaction hash from the Lit Action execution
  transactionHash?: string;
  // IPFS hash of any additional data stored by Lit Action
  litActionIpfsHash?: string;
  // Error information if the execution failed
  error?: {
    message: string;
    code: string;
  };
}

export interface AddressDecryptData {
  teacherAddressCiphertext: string;
  teacherAddressEncryptHash: string;
  learnerAddressCiphertext: string;
  learnerAddressEncryptHash: string;
}
