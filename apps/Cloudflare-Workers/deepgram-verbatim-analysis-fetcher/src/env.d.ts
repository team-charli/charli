// Environment interface for analysis-fetcher-worker
export interface Env {
	// R2 bucket for verbatim analysis reports
	VERBATIM_REPORTS_BUCKET: R2Bucket;
}