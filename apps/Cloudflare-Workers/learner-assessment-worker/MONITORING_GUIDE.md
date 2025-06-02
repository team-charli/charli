# Learner Assessment Pipeline Monitoring Guide

## Overview

This guide provides comprehensive monitoring for the learner assessment pipeline, specifically focused on scorecard generation during robo-teacher sessions.

## Quick Start

```bash
cd ~/Projects/charli/apps/Cloudflare-Workers/learner-assessment-worker
./monitor-scorecard-pipeline.sh  # Setup monitoring scripts
./monitor-primary.sh             # Start primary monitoring
```

## Available Monitoring Commands

### 1. Primary Monitor (`./monitor-primary.sh`)
**Use for:** General monitoring with reduced noise
**Filters:** Excludes `/audio/` processing logs
**Best for:** Initial overview of pipeline activity

### 2. Scorecard Focus (`./monitor-scorecard.sh`)
**Use for:** Scorecard-specific operations
**Filters:** `scorecard|assessment|mistake|error`
**Best for:** Tracking scorecard generation progress

### 3. Pipeline Stages (`./monitor-pipeline.sh`)
**Use for:** Debugging workflow failures
**Filters:** `processing|enrichment|detector|analyzer|orchestrator|persister`
**Best for:** Identifying which pipeline stage is failing

### 4. Robo Mode (`./monitor-robo.sh`)
**Use for:** Robo-teacher specific flows
**Filters:** `robo|thinking.*time|utterance|fragment`
**Best for:** Monitoring fragment accumulation and thinking time logic

### 5. Critical Errors (`./monitor-errors.sh`)
**Use for:** Immediate failure detection
**Filters:** `CRITICAL|ERROR|failed|timeout|persistence.*failed`
**Best for:** Alert-style monitoring for production issues

### 6. Success Indicators (`./monitor-success.sh`)
**Use for:** Confirming successful operations
**Filters:** `✅|🎉|successfully|completed|generated`
**Best for:** Validating end-to-end pipeline success

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
1. Run `./monitor-primary.sh` in main terminal
2. Run `./monitor-scorecard.sh` in second terminal
3. Run `./monitor-errors.sh` in third terminal for immediate alerts

### For Production Monitoring:
1. Run `./monitor-errors.sh` for immediate failure detection
2. Run `./monitor-success.sh` to confirm operations
3. Use `./monitor-pipeline.sh` for detailed debugging when issues occur

### For Robo-Teacher Validation:
1. Run `./monitor-robo.sh` to track robo-specific flows
2. Run `./monitor-scorecard.sh` to confirm scorecard generation
3. Look for teacher scorecard skip confirmation in robo mode

## Testing Validation

To validate the monitoring setup:

1. **Start monitoring** with primary + scorecard focus monitors
2. **Conduct a robo-teacher session** from start to finish
3. **Verify you see the complete pipeline** from session end to scorecard persistence
4. **Confirm robo-mode behavior** (teacher scorecard skipped, learner scorecard generated)
5. **Check for any errors** in the critical errors monitor

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