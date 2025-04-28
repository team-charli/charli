import { ScorecardOrchestratorDO } from "./ScorecardOrchestratorDO";

// apps/learner-assessment-worker/src/env.ts
export interface Env {
	LEARNER_ASSESSMENT_DO: DurableObjectNamespace<LearnerAssessmentDO>;
	MESSAGE_RELAY_DO: DurableObjectNamespace<MessageRelayDO>;
	PCM_TO_WAV_WORKER: Service<PcmToWavWorker>;
	AUDIO_BUCKET: R2Bucket;
	LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN: string;
	TRANSCRIBE_PROVIDER: string;
	AI: Ai;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SUPABASE_URL: string;
  ROBO_TEST_DO: Service<RoboTestDO>;
	SCORECARD_ORCHESTRATOR_DO:DurableObjectNamespace<ScorecardOrchestratorDO>
}
// env.ts

export interface Bindings {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  MISTAKE_DETECTOR_DO: DurableObjectNamespace;
  MISTAKE_ANALYZER_DO: DurableObjectNamespace;
  SCORECARD_PERSISTER_DO: DurableObjectNamespace;
}

export interface Env {
  Bindings: Bindings;
}

// For DOs
export interface DOEnv extends Bindings {}

