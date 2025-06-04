import { ScorecardOrchestratorDO } from "./ScorecardOrchestratorDO";

// TenseUsageFlag interface for analyzer prompts
export interface TenseUsageFlag {
  utterance: string;
  mistakenFragment: string;
  suggestedTense: string;
  reason: string;
}

// Main environment interface
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
	SCORECARD_PERSISTER_DO: DurableObjectNamespace;
	MISTAKE_DETECTOR_DO: DurableObjectNamespace;
	MISTAKE_ANALYZER_DO: DurableObjectNamespace;
	MISTAKE_ENRICHER_PIPELINE_DO: DurableObjectNamespace;
	AVG_FREQUENCY_ENRICHER_DO: DurableObjectNamespace;
	SESSION_FREQ_COLOR_ENRICHER_DO: DurableObjectNamespace;
	LEMMA_ENRICHER_DO: DurableObjectNamespace;
	TEACHER_SCORECARD_PERSISTER_DO: DurableObjectNamespace;
	// Added for RoboAudio WebSocket connections
	ROBO_AUDIO_CONNECTIONS?: Map<string, Map<string, WebSocket>>;
  DEEPGRAM_API_KEY: string;
  DEEPGRAM_URL: string;
	DG_LANGUAGE?: string;
	__BUILD_ID?: string;
	// AI Gateway now uses bindings - no manual configuration needed
	AI_SESSION_TOKEN_LIMIT?: string;
	// Service URLs for enricher pipelines
	LEMMA_ENRICHER_DO_URL?: string;
	AVG_FREQUENCY_ENRICHER_DO_URL?: string;
	TREND_ARROW_ENRICHER_DO_URL?: string;
	SESSION_COLOR_ENRICHER_DO_URL?: string;
}

// For DOs that need specific bindings
export interface DOEnv {
  AI: Ai;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MISTAKE_DETECTOR_DO: DurableObjectNamespace;
  MISTAKE_ANALYZER_DO: DurableObjectNamespace;
  MISTAKE_ENRICHER_PIPELINE_DO: DurableObjectNamespace;
  SCORECARD_PERSISTER_DO: DurableObjectNamespace;
  TEACHER_SCORECARD_PERSISTER_DO: DurableObjectNamespace;
  AVG_FREQUENCY_ENRICHER_DO: DurableObjectNamespace;
  SESSION_FREQ_COLOR_ENRICHER_DO: DurableObjectNamespace;
  LEMMA_ENRICHER_DO: DurableObjectNamespace;
  
  // AI Gateway now uses bindings - no manual configuration needed
  AI_SESSION_TOKEN_LIMIT?: string;
}

