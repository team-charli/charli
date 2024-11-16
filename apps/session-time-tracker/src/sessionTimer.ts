//sessionTimer.ts
import { ethers } from 'ethers';

export class SessionTimer {
  private duration!: number;
  private hashedTeacherAddress: string;
  private hashedLearnerAddress: string;

  constructor(public state: DurableObjectState, public env: Env) {}

async fetch(request: Request): Promise<Response> {
  if (request.method === 'POST') {
    const data = await request.json() as RequestPayload;
    console.log('[ST-INIT] Timer initialized:', {
      duration: data.duration,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + data.duration).toISOString(),
    });

    const { duration, hashedTeacherAddress, hashedLearnerAddress } = data;
    this.duration = duration;
    this.hashedTeacherAddress = hashedTeacherAddress;
    this.hashedLearnerAddress = hashedLearnerAddress;

    // Store times for warning and expiration
    const initiationTime = Date.now();
    const warningTime = initiationTime + duration - 3 * 60 * 1000; // 3 minutes before expiration
    const expirationTime = initiationTime + duration;

    // **Broadcast initiation message directly**
    await this.broadcastInitiationMessage();

    // **Set alarms for warning and expiration**
    await this.state.storage.put('alarmType', 'warning');
    await this.state.storage.put('expirationTime', expirationTime);
    await this.state.storage.setAlarm(warningTime);

    return new Response('OK');
  }
  return new Response('Not found', { status: 404 });
}

async alarm() {
  const alarmType = await this.state.storage.get('alarmType');

  if (alarmType === 'warning') {
    // Broadcast warning message
    await this.broadcastWarningMessage();

    // Set next alarm for expiration
    const expirationTime = await this.state.storage.get<number>('expirationTime');
    if (expirationTime === undefined) throw new Error("expirationTime is undefined")
    await this.state.storage.put('alarmType', 'expired');
    await this.state.storage.setAlarm(expirationTime);

  } else if (alarmType === 'expired') {
    // Broadcast expiration message
    await this.broadcastExpirationMessage();

    // Clean up stored data
    await this.state.storage.delete('alarmType');
    await this.state.storage.delete('expirationTime');
  }
}

  private async broadcastInitiationMessage() {
    try {
      const wallet = new ethers.Wallet(this.env.PRIVATE_KEY_SESSION_TIME_SIGNER);
      const timestampMs = String(Date.now());
      const signature = await wallet.signMessage(timestampMs);
      await this.broadcastMessage({ type: 'initiated', message: 'Timer initiated' }, { timestampMs, signature });
    } catch (error) {
      console.error(error);
      throw new Error('Error signing initiation message');
    }
  }

  private async broadcastWarningMessage() {
    await this.broadcastMessage({ type: 'warning', message: '3-minute warning' });
  }

  private async broadcastExpirationMessage() {
    try {
      const wallet = new ethers.Wallet(this.env.PRIVATE_KEY_SESSION_TIME_SIGNER);
      const timestampMs = String(Date.now());
      const signature = await wallet.signMessage(timestampMs);
      await this.broadcastMessage({ type: 'expired', message: 'Time expired' }, { timestampMs, signature });
    } catch (error) {
      console.error(error);
      throw new Error('Error signing expiration message');
    }
  }

  private async broadcastMessage(message: SessionTimerMessage, data?: SessionTimerData): Promise<void> {
    const webSocketManagerId = this.env.WEBSOCKET_MANAGER.idFromName(this.state.id.toString());
    const webSocketManagerStub = this.env.WEBSOCKET_MANAGER.get(webSocketManagerId);
    await webSocketManagerStub.fetch('http://websocket-manager/sessionTimerEvent', {
      method: 'POST',
      body: JSON.stringify({ message, data }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

interface Env {
  WEBSOCKET_MANAGER: DurableObjectNamespace;
  PRIVATE_KEY_SESSION_TIME_SIGNER: string;
}

interface RequestPayload {
  duration: number;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}

interface SessionTimerMessage {
  type: 'initiated' | 'warning' | 'expired';
  message: string;
}

interface SessionTimerData {
  timestampMs?: string;
  signature?: string;
}
