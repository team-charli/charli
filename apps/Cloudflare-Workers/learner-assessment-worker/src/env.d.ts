import { ScorecardOrchestratorDO } from "./ScorecardOrchestratorDO";

// apps/learner-assessment-worker/src/env.ts
export interface Env {
	LEARNER_ASSESSMENT_DO: DurableObjectNamespace<LearnerAssessmentDO>;
	MESSAGE_RELAY_DO: DurableObjectNamespace<MessageRelayDO>;
	PCM_TO_WAV_WORKER: Service<PcmToWavWorker>;
	HEY_CHARLI_WORKER: Fetcher;
	AI: Ai;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SUPABASE_URL: string;
	ROBO_TEST_URL: string;
	SCORECARD_ORCHESTRATOR_DO: DurableObjectNamespace<ScorecardOrchestratorDO>;
	// Added for RoboAudio WebSocket connections
	ROBO_AUDIO_CONNECTIONS?: Map<string, Map<string, WebSocket>>;
  DEEPGRAM_API_KEY: string;
  DEEPGRAM_URL: string;
	DG_LANGUAGE?: string;
	__BUILD_ID?: string;
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
export interface DOEnv {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MISTAKE_DETECTOR_DO: Fetcher;
  MISTAKE_ANALYZER_DO: Fetcher;
  MISTAKE_ENRICHER_PIPELINE_DO: Fetcher;
  SCORECARD_PERSISTER_DO: Fetcher;
}

