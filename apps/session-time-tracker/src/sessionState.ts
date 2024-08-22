//sessionState.ts
import {ethers} from 'ethers';
export class SessionState {
  participants: Record<string, Participant> = {};

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/submitSignature") {
      return this.submitSignature(request);
    }
    return new Response("Not found", { status: 404 });
  }

  async submitSignature(request: Request): Promise<Response> {
    const data: SubmitSignatureParams = await request.json();

    if (typeof data !== 'object' || !data) {
      return new Response("Invalid request", { status: 400 });
    }

    const sigVerificationResult = this.verifySignatures(data);

    if (sigVerificationResult && Object.keys(this.participants).length === 2) {
      console.log('Signatures and session duration verified. Session can start.');
      const [participantId1, participantId2] = Object.keys(this.participants);
      await this.startTimer(parseInt(data.sessionDuration), participantId1, participantId2, data.sessionId);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } else {
      console.error('Signature verification failed.');
      return new Response(JSON.stringify({ error: 'Signature verification failed.' }), { status: 403 });
    }
  }

  private verifySignatures(params: SubmitSignatureParams): boolean {
    const { hashedTeacherAddress, hashedLearnerAddress, teacher_joined_timestamp, teacher_joined_signature, teacher_joined_timestamp_worker_sig, learner_joined_timestamp, learner_joined_signature, learner_joined_timestamp_worker_sig, workerPublicAddress, sessionDuration } = params;

    const verifySignature = (hashedAddress: string, timestamp: string, signature: string, workerSignature: string, sessionDuration: string, workerPublicAddress: string): boolean => {

      const message = `${timestamp}${sessionDuration}`;
      const signerAddressFromSig = ethers.verifyMessage(message, signature);
      const hashedSignerAddress = ethers.keccak256(signerAddressFromSig);

      const workerSignerAddressFromSig = ethers.verifyMessage(message, workerSignature);
      const isWorkerVerified = workerSignerAddressFromSig.toLowerCase() === workerPublicAddress.toLowerCase();

      return hashedSignerAddress === hashedAddress && isWorkerVerified;
    };

    const teacherJoinSigs = verifySignature(hashedTeacherAddress, teacher_joined_timestamp, teacher_joined_signature, teacher_joined_timestamp_worker_sig, sessionDuration, workerPublicAddress);

    const learnerJoinSigs = verifySignature(hashedLearnerAddress, learner_joined_timestamp, learner_joined_signature, learner_joined_timestamp_worker_sig, sessionDuration, workerPublicAddress);

    console.log({ teacherJoinSigs, learnerJoinSigs });

    return teacherJoinSigs && learnerJoinSigs;
  }

 async startTimer(duration: number, hashedTeacherAddress: string, hashedLearnerAddress: string, sessionId: string) {
    const timerId = this.env.SESSION_TIMER.newUniqueId();
    const timerStub = this.env.SESSION_TIMER.get(timerId);
    const body = JSON.stringify({ duration, hashedTeacherAddress, hashedLearnerAddress, sessionId });
    const response = await timerStub.fetch(`http://session-timer/`, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    console.log(await response.text());
  }
}
interface Env {
  SESSION_TIMER: DurableObjectNamespace;

}

interface Participant {
  signature?: string;
  websocket?: WebSocket;
  ethereumAddress: string;
}

interface SubmitSignatureParams {
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  teacher_joined_timestamp: string;
  teacher_joined_signature: string;
  teacher_joined_timestamp_worker_sig: string;
  learner_joined_timestamp: string;
  learner_joined_signature: string;
  learner_joined_timestamp_worker_sig: string;
  workerPublicAddress: string;
  sessionDuration: string;
  sessionId: string;
}
