# Deepgram Chunking Configuration

This document explains how to enable and configure the new continuous transcription chunking feature that overcomes Deepgram's 5-second utterance limit.

## Overview

The chunking system enables uninterrupted speech transcription by:
- Intelligently segmenting audio streams into ~4-second chunks
- Using Voice Activity Detection (VAD) to find natural pause points
- Reassembling transcripts while preserving verbatim accuracy
- Supporting both Robo Mode and human sessions

## Environment Variables

### Frontend (.env)

```bash
# Enable chunking mode (set to 'true' to activate)
VITE_ENABLE_CHUNKING=true

# Deepgram API key for direct frontend connections (chunked mode only)
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

### Worker Environment

The existing Cloudflare Worker environment variables remain unchanged:
```bash
DEEPGRAM_API_KEY=your_deepgram_api_key_here
```

## Configuration Parameters

The chunking behavior can be adjusted in `/apps/vite-frontend/src/pages/room[id]/hooks/useDeepgramChunking.tsx`:

```typescript
const CHUNK_TARGET_DURATION_MS = 4000; // 4 seconds target
const MAX_CHUNK_DURATION_MS = 4800; // Hard limit at 4.8s
const VAD_SILENCE_THRESHOLD = 0.01; // Amplitude threshold for silence detection
const VAD_SILENCE_DURATION_MS = 500; // Minimum silence duration to trigger chunk boundary
const UTTERANCE_END_SILENCE_MS = 1500; // Silence duration to mark utterance as complete
const EARLY_FINALIZATION_MS = 1000; // Allow early chunk finalization after this silence
```

### Key Improvements in v2.0:
- **Persistent Utterance IDs**: Each continuous speech segment maintains the same utteranceId across multiple chunks
- **Smart Utterance End Detection**: Only finalizes utterances after proper silence periods (1.5s), not just chunk boundaries
- **Early Finalization**: Completes short utterances quickly when 1s+ silence is detected
- **Improved Sorting**: Uses actual timestamps instead of string comparison for correct chunk ordering
- **Minimal Punctuation Processing**: Preserves verbatim Spanish content with only whitespace normalization

## Operating Modes

### Legacy Mode (Default)
- `VITE_ENABLE_CHUNKING=false` or unset
- Audio streams directly to LearnerAssessmentDO
- Uses existing Deepgram smart-listen with 5-second limit
- Compatible with current workflow

### Chunked Mode (New)
- `VITE_ENABLE_CHUNKING=true`
- Frontend handles audio chunking with VAD
- Direct Deepgram connections per chunk
- Transcript reassembly on both frontend and server
- Overcomes 5-second limit for continuous speech

## API Endpoints

### New Chunked Transcript Endpoint
```
POST /chunked-transcript/:roomId
```

Payload:
```json
{
  "utteranceId": "string",
  "segments": [
    {
      "chunkId": "string",
      "speakerRole": "learner" | "teacher",
      "text": "string",
      "confidence": number,
      "startTime": number,
      "endTime": number,
      "isPartial": boolean
    }
  ],
  "isComplete": boolean,
  "speakerRole": "learner" | "teacher"
}
```

## Key Features

### Voice Activity Detection (VAD)
- Detects silence periods to find natural chunk boundaries
- Prevents mid-word cuts that could affect transcription accuracy
- Configurable thresholds for different environments

### Semantic Coherence
- Prioritizes natural pause points (end of words/phrases)
- Falls back to hard time limits only when necessary
- Preserves Spanish verbatim fidelity as required

### Real-time Feedback
- Interim transcripts displayed as user speaks
- Progressive assembly shows speech in real-time
- Complete utterances trigger robo responses and scoring

### Dual Processing
- Both learner and teacher speech handled identically
- Parallel processing prevents blocking between speakers
- Maintains speaker attribution throughout

## Testing

### Enable Chunked Mode
1. Set `VITE_ENABLE_CHUNKING=true` in frontend environment
2. Add `VITE_DEEPGRAM_API_KEY` with valid Deepgram API key
3. Test in both Robo Mode and human sessions

### Verification Points
- [ ] **Continuous Speech**: 10+ second monologues are captured as single utterances
- [ ] **Natural Pause Detection**: Brief pauses (0.5s) don't end utterances, longer pauses (1.5s+) do
- [ ] **Verbatim Accuracy**: Spanish speech preserves filler words, exact pronunciation, no auto-correction
- [ ] **Robo Response Timing**: Robot waits for complete utterance before responding (no mid-speech interruption)
- [ ] **Human Session Integration**: Teacher and learner transcripts are properly attributed and stored
- [ ] **Real-time Captions**: Live transcript updates smoothly during speech
- [ ] **Early Finalization**: Short utterances (1-2 words) complete quickly after 1s silence
- [ ] **Chunk Ordering**: Multi-chunk utterances display in correct sequence (especially >9 chunks)

### Test Scenarios

1. **Long Monologue Test** (>10 seconds continuous Spanish)
   - Expected: Single utteranceId, multiple chunks, one final transcript
   - Verify: Robo responds only after speaker stops, not at 5s mark

2. **Short Response Test** (1-2 word answers)
   - Expected: Quick finalization after ~1s silence
   - Verify: Minimal latency, immediate robo response

3. **Interrupted Speech Test** (pause mid-sentence, continue)
   - Expected: Same utteranceId maintained across pause
   - Verify: Complete sentence assembled, no premature finalization

4. **Rapid Exchange Test** (quick back-and-forth)
   - Expected: Separate utteranceIds for each speaker turn
   - Verify: Clean speaker attribution, no cross-contamination

### Performance Metrics
- Chunk duration should average 3-4 seconds
- VAD should detect pauses within 300ms
- Transcript assembly should be seamless
- No loss of audio data between chunks

## Troubleshooting

### Common Issues

1. **No chunking active**: Check `VITE_ENABLE_CHUNKING=true` is set
2. **Deepgram connection fails**: Verify `VITE_DEEPGRAM_API_KEY` is valid
3. **Choppy transcripts**: Adjust `VAD_SILENCE_THRESHOLD` lower for more sensitive detection
4. **Too many chunks**: Increase `VAD_SILENCE_DURATION_MS` to require longer pauses

### Debug Logging

The implementation includes extensive console logging:
- `[DeepgramChunking]` - Frontend chunking operations
- `[LearnerAssessmentDO]` - Server-side transcript assembly
- `[Room]` - UI transcript updates

## Migration Strategy

The feature is designed for safe rollout:

1. **Phase 1**: Deploy with `VITE_ENABLE_CHUNKING=false` (no change)
2. **Phase 2**: Enable for testing environments
3. **Phase 3**: Gradual rollout to production users
4. **Phase 4**: Full deployment once validated

The legacy mode remains fully functional as a fallback option.