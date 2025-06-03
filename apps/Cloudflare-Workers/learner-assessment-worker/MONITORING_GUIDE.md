# Learner Assessment Pipeline Monitoring Guide

## Overview

This guide provides comprehensive monitoring for the learner assessment pipeline, specifically focused on scorecard generation during robo-teacher sessions.

## Quick Start

```bash
cd ~/Projects/charli/apps/Cloudflare-Workers/learner-assessment-worker
./monitor-unified.sh             # Start unified monitoring (default: scorecard focus)
./monitor-unified.sh --help      # See all available options
```

## Available Monitoring Modes

The unified monitoring script (`./monitor-unified.sh`) provides several focused monitoring modes:

### 1. Scorecard Focus (Default)
```bash
./monitor-unified.sh --scorecard  # or just ./monitor-unified.sh
```
**Use for:** Scorecard-specific operations and success tracking
**Filters:** `scorecard|assessment|mistake|error|✅|🎉|successfully|completed|generated|🚀.*Initiating|ScorecardOrchestratorDO|Starting.*mistake|Starting.*enrichment|Starting.*persistence|Persisting.*scorecard|transcribeAndDiarizeAll|end-session.*error|Missing required IDs|No segments found|scorecard.*null|null.*scorecard|🏁.*Session.*ending`
**Best for:** Production scorecard verification and debugging null scorecard issues

### 2. Critical Errors Only
```bash
./monitor-unified.sh --errors
```
**Use for:** Immediate failure detection
**Filters:** `CRITICAL|ERROR|failed|timeout|persistence.*failed`
**Best for:** Alert-style monitoring for production issues

### 3. Robo Mode
```bash
./monitor-unified.sh --robo
```
**Use for:** Robo-teacher specific flows
**Filters:** `robo|thinking.*time|utterance|fragment`
**Best for:** Monitoring fragment accumulation and thinking time logic

### 4. Pipeline Stages
```bash
./monitor-unified.sh --pipeline
```
**Use for:** Debugging workflow failures
**Filters:** `processing|enrichment|detector|analyzer|orchestrator|persister|Starting.*mistake|Starting.*enrichment|Starting.*persistence|detection.*completed|analysis.*completed|enrichment.*completed|MISTAKE_DETECTOR_DO|MISTAKE_ANALYZER_DO|MISTAKE_ENRICHER_PIPELINE_DO|SCORECARD_PERSISTER_DO`
**Best for:** Identifying which pipeline stage is failing

### 5. All Logs (Color-Coded)
```bash
./monitor-unified.sh --all
```
**Use for:** Comprehensive monitoring with color coding
**Filters:** All logs except `/audio/` processing (reduces noise)
**Best for:** Development and detailed debugging

**Color Coding:**
- 🔴 **Red**: Critical errors, failures, timeouts
- 🟢 **Green**: Success indicators (✅, 🎉, completed, generated)
- 🟡 **Yellow**: Warnings
- 🟣 **Purple**: Robo-specific logs
- 🔵 **Blue**: Pipeline stages
- 🔷 **Cyan**: Scorecard operations

## Key Pipeline Stages to Monitor

### 1. Session Initialization
**Look for:**
- `[LearnerAssessmentDO] 🏁 Session ending for room {roomId}`
- `Retrieved storage data - session_id: {id}, learner_id: {id}`

**Alert on:**
- `CRITICAL ERROR: Missing required IDs`
- `WARNING: Deepgram socket not open during session end`

### 2. Scorecard Pipeline Trigger
**Look for:**
- `[LearnerAssessmentDO] 🚀 Initiating scorecard generation pipeline`
- `Extracted {n} learner segments from {total} total segments`

**Alert on:**
- `No segments found for transcription`
- `Scorecard generation failed`

### 3. Mistake Detection & Analysis
**Look for:**
- `[ScorecardOrchestratorDO] Starting mistake detection pipeline`
- `Mistake detection completed: {n} mistakes found`
- `Mistake analysis completed: {n} mistakes analyzed`

**Alert on:**
- `CRITICAL ERROR in mistake detection`
- `CRITICAL ERROR in mistake analysis`
- `Detection failures or timeout errors`

### 4. Enrichment Pipeline
**Look for:**
- `[ScorecardOrchestratorDO] Starting enrichment pipeline`
- `Enrichment pipeline completed: {n} mistakes enriched`

**Alert on:**
- `CRITICAL ERROR in enrichment pipeline`
- `Enrichment failures that could corrupt scorecards`

### 5. Scorecard Persistence
**Look for:**
- `[ScorecardPersisterDO] Starting persistence for session {id}`
- `[ScorecardPersisterDO] ✅ Scorecard successfully inserted`
- `[ScorecardPersisterDO] 🎉 Complete persistence success`

**Alert on:**
- `CRITICAL ERROR: Failed to insert scorecard`
- `CRITICAL ERROR: Failed to insert learner_mistakes`
- `Database persistence errors`

## Success Indicators Checklist

For a successful robo-teacher session scorecard generation, you should see:

✅ **Session End Trigger:**
- Session ending logged with segment count
- Storage data retrieved successfully

✅ **Pipeline Initiation:**
- Scorecard generation pipeline started
- Learner segments extracted from total segments

✅ **Detection Pipeline:**
- Mistake detection completed without errors
- Mistake analysis completed without errors
- Enrichment pipeline completed without errors

✅ **Persistence Success:**
- Scorecard successfully inserted into database
- Mistakes successfully inserted into database
- Complete persistence success logged

✅ **Final Confirmation:**
- Scorecard generation completed successfully
- Final scorecard summary with accuracy metrics

## Debugging Scorecard === null Issues

When `scorecard === null` is returned, run `./monitor-unified.sh -s` and look for these specific error patterns:

### 1. Missing Session Metadata
```
CRITICAL ERROR: Missing required IDs - session_id: null, learner_id: null
```
**Cause:** Session metadata (sessionId/learnerId) was not properly stored during session initialization
**Fix:** Verify Room.tsx is passing sessionId and learnerId in the uploadUrl query parameters

### 2. No Audio Segments Collected
```
No segments found for transcription
```
**Cause:** Deepgram did not collect any speech segments during the session
**Fix:** Check audio pipeline, microphone permissions, and Deepgram connection

### 3. Scorecard Generation Pipeline Failure
```
CRITICAL ERROR: Scorecard generation failed for session X: [error details]
```
**Cause:** The ScorecardOrchestratorDO pipeline encountered an error during processing
**Fix:** Check AI Gateway connectivity, database access, and pipeline DO health

### 4. Session End Not Triggered
```
🎯 [WORKER-INDEX] END-SESSION REQUEST ENTRY - roomId: X
🎯 [DO-FETCH] END-SESSION REQUEST RECEIVED IN DO FETCH
🎯 [HANDLE-AUDIO] END-SESSION REQUEST RECEIVED - roomId: X
🎯 [END-SESSION] 🏁 Session ending for room X - starting scorecard generation process
```
**Airtight Logging:** These logs show exactly where end-session requests are in the pipeline
**Missing any of these means:** Request is not reaching that specific layer
**Fix:** Verify handleEndSession() in Room.tsx is calling the uploadUrl with `&action=end-session`

## Failure Patterns to Watch For

### Database Connection Issues
```
CRITICAL ERROR: Failed to insert scorecard: connection timeout
CRITICAL ERROR: Failed to insert learner_mistakes: connection refused
```

### AI Gateway Problems
```
CRITICAL ERROR in mistake detection: AI Gateway rate limit
CRITICAL ERROR in mistake analysis: timeout
```

### Pipeline Setup Issues
```
CRITICAL ERROR: Missing required IDs - session_id: null, learner_id: null
WARNING: No analyzed mistakes provided - detection pipeline failure
```

### Robo Mode Detection Problems
```
Skipping teacher scorecard - no teacher_id provided (likely robo-mode)
```

## Recommended Monitoring Strategy

### For Development/Testing:
```bash
./monitor-unified.sh --all        # Comprehensive monitoring with color coding
```

### For Production Monitoring:
```bash
./monitor-unified.sh              # Default scorecard focus (recommended)
./monitor-unified.sh --errors     # Run in second terminal for immediate alerts
```

### For Robo-Teacher Validation:
```bash
./monitor-unified.sh --robo       # Track robo-specific flows and thinking time
```

### For Debugging Pipeline Issues:
```bash
./monitor-unified.sh --pipeline   # Detailed pipeline stage monitoring
```

## Testing Validation

To validate the monitoring setup:

1. **Start monitoring** with unified script:
   ```bash
   ./monitor-unified.sh              # Default scorecard monitoring
   ```
2. **Conduct a robo-teacher session** from start to finish
3. **Verify you see the complete pipeline** from session end to scorecard persistence
4. **Confirm robo-mode behavior** (teacher scorecard skipped, learner scorecard generated)
5. **Check for any errors** by running error monitoring in a second terminal:
   ```bash
   ./monitor-unified.sh --errors     # Critical error monitoring
   ```

## Troubleshooting

If you don't see expected logs:
- Verify you're in the correct directory
- Check that `bunx wrangler` is authenticated
- Ensure the worker is deployed and receiving requests
- Confirm `rg` (ripgrep) is installed and in PATH

## Log Retention

Cloudflare Workers logs are retained for 24 hours. For longer-term monitoring, consider:
- Capturing logs to files: `./monitor-primary.sh > logs/monitor-$(date +%Y%m%d-%H%M%S).log`
- Setting up external log aggregation if needed