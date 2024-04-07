import ethers from 'ethers';
export class SessionState {
  participants: Record<string, Participant> = {};
  // private sessionDetails?: SessionDetails;

  constructor(public state: DurableObjectState, public env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/submitSignature") {
      return this.submitSignature(request);
    } else if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
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
      await this.startTimer(parseInt(data.sessionDuration), participantId1, participantId2);
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

  private async handleWebSocket(request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    const participantId = new URL(request.url).searchParams.get('participantId');
    if (!participantId) return new Response("Participant ID required", { status: 400 });
    this.participants[participantId] = { ...(this.participants[participantId] || {}), websocket: server };
    server.accept();
    server.addEventListener('message', event => {
      const messageData = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
      this.handleMessage(participantId, messageData);
    });
    return new Response(null, { status: 101, webSocket: client });
  }


  private async handleMessage(participantId: string, message: string): Promise<void> {
    console.log(`Message from ${participantId}: ${message}`);
  }

  private async broadcastMessageToParticipants(message: Object): Promise<void> {
    for (const participantId in this.participants) {
      const participant = this.participants[participantId];
      if (participant.websocket?.readyState === WebSocket.READY_STATE_OPEN) {
        participant.websocket.send(JSON.stringify(message));
      }
    }
  }
  async startTimer(duration: number, hashedTeacherAddress: string, hashedLearnerAddress: string) {
    const timerId = this.env.TIMER_OBJECT.idFromName(`${hashedTeacherAddress}-${hashedLearnerAddress}`);
    const timerStub = this.env.TIMER_OBJECT.get(timerId);

    const body = JSON.stringify({ duration, hashedTeacherAddress, hashedLearnerAddress });

    const response = await timerStub.fetch('http://timer/', {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    console.log(await response.text());
  }
}
interface Env {
  TIMER_OBJECT: DurableObjectNamespace;
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
}

// interface SessionDetails {
//   hashedTeacherAddress: string;
//   hashedLearnerAddress: string;
//   teacherEthereumAddress: string;
//   learnerEthereumAddress: string;
//   signatures: {
//     teacher: {
//       joinedTimestamp: string;
//       joinedSignature: string;
//       joinedTimestampWorkerSig: string;
//     };
//     learner: {
//       joinedTimestamp: string;
//       joinedSignature: string;
//       joinedTimestampWorkerSig: string;
//     };
//   };
//   workerPublicAddress: string;
// }
