// types.ts

export type Env = {
  HUDDLE_API_KEY: string;
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  CONNECTION_MANAGER: DurableObjectNamespace;
  SESSION_TIMER: DurableObjectNamespace;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
};
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
  joinedAtSig: string | null;
  leftAtSig: string | null;
  faultTime?: number;
  faultTimeSig?: string;
  duration: number | null;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

