# Learner Assessment Worker

This Cloudflare Worker handles real-time audio processing, Deepgram transcription, mistake analysis, and robo-teacher response generation with intelligent thinking time delays.

## Current System Overview

The worker processes audio streams through Deepgram's Nova-2 model with custom thinking time logic designed for language learning. Key features:

- **Real-time transcription** via Deepgram WebSocket API
- **Intelligent thinking delays** (5-10 seconds) that encourage thoughtful responses
- **Robo-teacher integration** with conversation-aware Spanish tutoring
- **Mistake detection and analysis** pipeline for learner assessment
- **Audio level monitoring** for AGC/compression debugging

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DEEPGRAM_API_KEY` | Deepgram API key for transcription | **Yes** | None |
| `DEEPGRAM_URL` | Deepgram WebSocket endpoint | Yes | `wss://api.deepgram.com/v1/listen` |
| `ROBO_TEST_URL` | URL for robo-teacher worker | Yes | `https://robo-test.charli.chat/robo-teacher-reply` |
| `SUPABASE_URL` | Supabase project URL | **Yes** | None |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | **Yes** | None |
| `AI_GATEWAY_URL` | Cloudflare AI Gateway endpoint | **Yes** | None |
| `AI_GATEWAY_AUTH_TOKEN` | AI Gateway authentication token | **Yes** | None |

## Deepgram Configuration

Current optimized settings for Spanish language learning:

```typescript
// Deepgram WebSocket parameters
wsURL.searchParams.set('model', '2-general-nova');
wsURL.searchParams.set('language', 'es');
wsURL.searchParams.set('interim_results', 'true');
wsURL.searchParams.set('endpointing', '10000');     // 10s max silence
wsURL.searchParams.set('vad_events', 'true');
wsURL.searchParams.set('smart_format', 'true');
```

## Pedagogical Thinking Time System

The worker implements intelligent thinking delays designed to encourage deeper Spanish language processing:

### How It Works

1. **Speech Detection**: Deepgram processes your audio and detects speech completion
2. **Dynamic Timer Calculation**: `delayMs = max(0, min(TARGET - speechDuration, MAX_DELAY))`
3. **Debounce Logic**: Timer resets if learner continues speaking (prevents interruption)
4. **FIFO Queue**: Multiple utterances are processed in order with individual delays
5. **Robo-Teacher Trigger**: Response generation begins after thinking time expires

### Timing Examples

| Your Speech Duration | Thinking Delay | Total Response Time | Learning Purpose |
|---------------------|----------------|-------------------|------------------|
| 0.5s ("sí") | ~6.5s | ~7s total | Encourages elaboration |
| 2.0s ("Creo que...") | ~5s | ~7s total | Rewards thoughtful start |
| 3.0s (complex sentence) | ~4s | ~7s total | Maintains natural pace |
| 7.0s+ (extended response) | 0s | Immediate | No additional delay needed |
| 15s+ (very long monologue) | 0s | Immediate | Capped at maximum |

### Enhanced Features

**Debounce Protection**: If you continue speaking after an `is_final` message, the thinking timer resets to prevent interrupting your ongoing thought.

**Queue-Based Processing**: Multiple rapid utterances are queued and processed in order, each with their own calculated delay.

**Safety Caps**: 
- Minimum delay: 0ms (no negative delays)
- Maximum delay: 10 seconds (prevents extremely long waits)

### Why This Design?

**Problem Solved**: Quick, reflexive responses ("sí", "no") often indicate surface-level thinking in language learning.

**Solution**: Longer delays for short utterances encourage learners to:
- Reconsider and elaborate on simple responses
- Develop more complex Spanish expressions
- Build comfort with extended thinking in the target language
- Continue speaking without being interrupted by premature robo responses

**Result**: You naturally develop habits of giving longer, more thoughtful Spanish responses.

## Safe Performance Adjustments

### Response Time Tuning

The **safest parameters to adjust** for faster responses are the thinking time constants:

**Location**: `src/LearnerAssessmentDO.ts` around line 34-35:
```typescript
const THINK_TIME_TARGET_MS = 7_000;  // Target total thinking time (7 seconds)
const THINK_TIME_MAX_MS = 10_000;    // Maximum thinking time cap (10 seconds)
```

**Safe Values for THINK_TIME_TARGET_MS**:
- `6_000` (6 seconds) - Moderate speedup, preserves learning logic
- `5_000` (5 seconds) - Faster responses, still pedagogically sound  
- `4_000` (4 seconds) - Much faster, may feel rushed for complex thoughts

**Safe Values for THINK_TIME_MAX_MS**:
- `8_000` (8 seconds) - Shorter maximum delay cap
- `6_000` (6 seconds) - Faster for very long utterances
- Should generally be ≥ THINK_TIME_TARGET_MS

**Why This is Safe**:
- ✅ Preserves the pedagogical design (short utterances still get longer delays)
- ✅ No impact on audio processing, Deepgram, or WebSocket handling
- ✅ No breaking changes to worker communication
- ✅ Maintains the AGC/SNR problem solutions
- ✅ Debounce logic prevents interrupting ongoing speech

**Example Impact**:
```typescript
// Current (THINK_TIME_TARGET_MS = 7_000):
"hola" (0.5s speech) → 6.5s delay
"long sentence" (8s speech) → 0s delay (capped at 0)

// With THINK_TIME_TARGET_MS = 5_000:
"hola" (0.5s speech) → 4.5s delay  
"long sentence" (8s speech) → 0s delay (capped at 0)
```

### What NOT to Adjust

**Dangerous Parameters** (avoid changing):
- `endpointing: '10000'` - Affects Deepgram VAD and speech detection
- Audio level thresholds - Tuned for AGC/compression issues
- WebSocket reconnection logic - Handles network stability
- Message deduplication - Prevents processing errors

## Debugging

### Real-time Monitoring

Monitor worker activity with filtered logs:

```bash
# All worker logs
wrangler tail learner-assessment-worker --format pretty

# Filter out audio data (recommended for readability)
wrangler tail learner-assessment-worker --format pretty | rg -v '/audio/'

# Monitor robo-teacher responses
wrangler tail robo-test-mode --format pretty
```

### Key Log Patterns

**Speech Processing**:
- `[DG-ANALYSIS]` - Deepgram transcription results
- `[DG-THINKING]` - Thinking timer status and delays
- `[NOISE-ANALYSIS]` - Audio level monitoring for AGC debugging

**Robo-Teacher Flow**:
- `🧠 Starting Xms thinking timer` - Delay initiated
- `⏰ Thinking time expired` - Processing utterance after delay
- `[RoboTestDO] Reply for roomId →` - Response generated

**Timing Analysis**:
- `[DG-TIMING]` - Speech detection and silence tracking
- `timeSinceLastSpeech: Xms` - Duration used in thinking time calculation

### Common Issues

**No Robo-Teacher Response**:
1. Check if you're in robo mode in the frontend
2. Verify `ROBO_TEST_URL` environment variable is set
3. Look for thinking timer logs - response comes after timer expires

**Delayed Responses**:
- **Expected**: 5-10 second delays are by design for learning
- **Check logs**: Look for thinking timer duration in `🧠 Starting Xms` messages
- **Adjust if needed**: Modify `thinkingTimeMs` parameter (see Safe Adjustments)

**Audio Level Issues**:
- `[NOISE-ANALYSIS]` logs show audio levels in dB
- Poor SNR (< 10dB difference) may indicate AGC compression
- Speech typically -10dB to -50dB, ambient should be < -60dB

**WebSocket Connection Issues**:
- `[DG] open - ready to receive audio` - Successful Deepgram connection
- `[DG] throttling burst` - Normal audio processing
- Missing these logs indicates connection problems