import { ethers } from 'ethers';

export class SessionTimer {
  private duration: number;
  private hashedTeacherAddress: string;
  private hashedLearnerAddress: string;

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      const { duration, hashedTeacherAddress, hashedLearnerAddress } = await request.json() as RequestPayload;
      this.duration = duration;
      this.hashedTeacherAddress = hashedTeacherAddress;
      this.hashedLearnerAddress = hashedLearnerAddress;
      await this.state.storage.setAlarm(Date.now() + duration);
      return new Response('OK');
    }
    return new Response('Not found', { status: 404 });
  }

  async alarm() {
    const now = Date.now();
    const warningTime = now + this.duration - 3 * 60 * 1000; // 3 minutes warning
    const expirationTime = now + this.duration;

    try {
      const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
      const currentTime = new Date();
      const timestampMs = String(currentTime.getTime());
      const signature = await wallet.signMessage(timestampMs);
      await this.broadcastMessage({ type: 'initiated', message: 'Timer initiated' }, { timestampMs, signature });
    } catch (error) {
      console.error(error);
      throw new Error('Error signing');
    }

    if (now >= warningTime && now < expirationTime) {
      await this.broadcastMessage({ type: 'warning', message: '3 minute warning' });
    } else if (now >= expirationTime) {
      try {
        const wallet = new ethers.Wallet(this.env.PRIVATE_KEY);
        const currentTime = new Date();
        const timestampMs = String(currentTime.getTime());
        const signature = await wallet.signMessage(timestampMs);
        await this.broadcastMessage({ type: 'expired', message: 'Time expired' }, { timestampMs, signature });
      } catch (error) {
        console.error(error);
        throw new Error('Error signing');
      }
    }
  }

  private async broadcastMessage(message: Object, data?: Object): Promise<void> {
    const connectionManagerId = this.env.CONNECTION_MANAGER.idFromName(this.state.id.toString());
    const connectionManagerStub = this.env.CONNECTION_MANAGER.get(connectionManagerId);
    await connectionManagerStub.fetch('http://connection-manager/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message, data }),
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

interface Env {
  CONNECTION_MANAGER: DurableObjectNamespace;
  PRIVATE_KEY: string;
}

interface RequestPayload {
  duration: number;
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
}
