// apps/learner-assessment-worker/src/env.ts
export interface Env {
	LEARNER_ASSESSMENT_DO: DurableObjectNamespace<LearnerAssessmentDO>;
	MESSAGE_RELAY_DO: DurableObjectNamespace<MessageRelayDO>;
	PCM_TO_WAV_WORKER: Service<PcmToWavWorker>;
	AUDIO_BUCKET: R2Bucket;
	LEARNER_ASSESSMENT_TRANSCRIBE_TOKEN: string;
	TRANSCRIBE_PROVIDER: string;
}
