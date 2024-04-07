import ethers from 'ethers';
export class SessionState {
  participants: Record<string, Participant> = {};
  private sessionDetails?: SessionDetails;

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

  private async submitSignature(request: Request): Promise<Response> {
    const data: CheckSigsParams = await request.json();

    if (typeof data !== 'object' || !data)
    return new Response("Invalid request", { status: 400 });

    const {
      hashedTeacherAddress,
      hashedLearnerAddress,
      teacherEthereumAddress,
      learnerEthereumAddress,
      teacher_joined_timestamp,
      teacher_joined_signature,
      teacher_joined_timestamp_worker_sig,
      learner_joined_timestamp,
      learner_joined_signature,
      learner_joined_timestamp_worker_sig,
      workerPublicAddress,
    } = data;

    this.sessionDetails = {
      hashedTeacherAddress,
      hashedLearnerAddress,
      teacherEthereumAddress,
      learnerEthereumAddress,
      signatures: {
        teacher: {
          joinedTimestamp: teacher_joined_timestamp,
          joinedSignature: teacher_joined_signature,
          joinedTimestampWorkerSig: teacher_joined_timestamp_worker_sig,
        },
        learner: {
          joinedTimestamp: learner_joined_timestamp,
          joinedSignature: learner_joined_signature,
          joinedTimestampWorkerSig: learner_joined_timestamp_worker_sig,
        }
      },
      workerPublicAddress,
    };

    // Check if the submission from both participants aligns and is complete
    await this.checkReadiness();

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    const participantId = new URL(request.url).searchParams.get('participantId');
    if (!participantId) return new Response("Participant ID required", { status: 400 }); // Handle null
    this.participants[participantId] = { ...(this.participants[participantId] || {}), websocket: server };
    server.accept();
    server.addEventListener('message', event => this.handleMessage(participantId, event.data));
    await this.checkReadiness();
    return new Response(null, { status: 101, webSocket: client });
  }

  private checkJoinSigs(details: SessionDetails): boolean {
    const verifySignature = ({
      role,
      hashedAddress,
      timestamp,
      signature,
      workerSignature,
      workerPublicAddress
    }: VerifySignatureParams) => {
      const signerAddress = ethers.verifyMessage(`${timestamp}${role}`, signature);
      const isUserVerified = ethers.keccak256(signerAddress) === hashedAddress;

      const workerSignerAddress = ethers.verifyMessage(`${timestamp}${role}`, workerSignature);
      const isWorkerVerified = workerSignerAddress.toLowerCase() === workerPublicAddress.toLowerCase();

      return isUserVerified && isWorkerVerified;
    };

    const teacherJoinSigs = verifySignature({
      role: "teacher",
      hashedAddress: details.hashedTeacherAddress,
      timestamp: details.signatures.teacher.joinedTimestamp,
      signature: details.signatures.teacher.joinedSignature,
      workerSignature: details.signatures.teacher.joinedTimestampWorkerSig,
      workerPublicAddress: details.workerPublicAddress,
    });

    const learnerJoinSigs = verifySignature({
      role: "learner",
      hashedAddress: details.hashedLearnerAddress,
      timestamp: details.signatures.learner.joinedTimestamp,
      signature: details.signatures.learner.joinedSignature,
      workerSignature: details.signatures.learner.joinedTimestampWorkerSig,
      workerPublicAddress: details.workerPublicAddress,
    });

    return teacherJoinSigs && learnerJoinSigs;
  }

  async checkReadiness(): Promise<void> {
    const allReady = Object.keys(this.participants).length === 2 &&
      Object.values(this.participants).every(p => p.signature && p.ethereumAddress);
    if (this.sessionDetails && allReady) {
      const sigVerificationResult = this.checkJoinSigs(this.sessionDetails);
      if (sigVerificationResult) {
        console.log('Signatures verified. Session can start.');
        // Further actions upon successful verification...
      } else {
        console.error('Signature verification failed.');
      }
    }
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
}
interface Env {
  // Define the properties of `Env` here
}

interface Participant {
  signature?: string;
  websocket?: WebSocket;
  ethereumAddress: string;
  hashedAddress: string;
}
interface VerifySignatureParams {
  role: "teacher" | "learner";
  hashedAddress: string;
  timestamp: string;
  signature: string;
  workerSignature: string;
  workerPublicAddress: string;
}
interface CheckSigsParams {
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  teacherEthereumAddress: string;
  learnerEthereumAddress: string;
  teacher_joined_timestamp: string;
  teacher_joined_signature: string;
  teacher_joined_timestamp_worker_sig: string;
  learner_joined_timestamp: string;
  learner_joined_signature: string;
  learner_joined_timestamp_worker_sig: string;
  workerPublicAddress: string;

}
interface SessionDetails {
  hashedTeacherAddress: string;
  hashedLearnerAddress: string;
  teacherEthereumAddress: string;
  learnerEthereumAddress: string;
  signatures: {
    teacher: {
      joinedTimestamp: string;
      joinedSignature: string;
      joinedTimestampWorkerSig: string;
    };
    learner: {
      joinedTimestamp: string;
      joinedSignature: string;
      joinedTimestampWorkerSig: string;
    };
  };
  workerPublicAddress: string;
}
