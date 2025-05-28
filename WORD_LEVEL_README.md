# Word-Level Detail Feature - Removed in commit e6b2f14

## What Was Removed

The legacy Deepgram message handling included word-level detail collection that was removed when cleaning up the codebase. This feature captured individual word metadata from Deepgram's WebSocket responses.

## Original Implementation

```typescript
/* word-level detail */
if (alt.words?.length) {
    const speaker = String(msg.channel.speaker ?? '0');
    const role = speaker === '0' ? 'learner' : 'teacher';
    for (const w of alt.words) {
        this.words.push({
            peerId: speaker,
            role,
            word: w.word,
            start: w.start,
            end: w.end,
            conf: w.confidence
        });
    }
}
```

## What It Provided

Each word in a Deepgram response included:

- **word**: The actual transcribed word (e.g., "aplicación")
- **start**: Timestamp when the word began (in seconds)
- **end**: Timestamp when the word ended (in seconds) 
- **confidence**: Deepgram's confidence score for this specific word (0-1)
- **speaker**: Which speaker said the word (for diarization)
- **punctuated_word**: Formatted version with punctuation

## Potential Use Cases in Charli's Scorecard System

### 1. **Enhanced Lemmatization**
Instead of lemmatizing entire sentences, you could:
- Lemmatize individual words with their confidence scores
- Skip lemmatization for low-confidence words that might be transcription errors
- Preserve timing information for temporal analysis of word usage

### 2. **Pronunciation Analysis**
- Measure word duration vs. expected duration for pronunciation assessment
- Identify hesitations or prolonged words that might indicate difficulty
- Compare word-level confidence scores to identify mispronunciations

### 3. **Fine-Grained Bell Events**
Your bell system (lines 82-94) could be enhanced with:
- Timestamp bells to specific words that triggered corrections
- Track which exact words caused teacher interventions
- Correlate bell timing with word confidence scores

### 4. **Temporal Mistake Detection**
- Map mistakes to specific word timestamps
- Analyze patterns in word confidence across time
- Identify if mistakes cluster around certain time periods in sessions

### 5. **Advanced Frequency Analysis**
Your frequency enrichers could:
- Track word usage frequency with precise timing
- Analyze speaking pace (words per minute) over time
- Identify vocabulary complexity progression

### 6. **Granular Error Classification**
Instead of sentence-level error detection:
- Pinpoint exact words with grammatical/vocabulary errors
- Correlate word confidence with error likelihood
- Build word-level error patterns for learner assessment

## Sample Deepgram Word Data

```json
{
  "word": "aplicación",
  "start": 15.16,
  "end": 15.66,
  "confidence": 0.87231445,
  "speaker": 0,
  "punctuated_word": "aplicación."
}
```

## Restoration Considerations

If you want to re-enable word-level tracking:

1. **Modern Implementation**: Add word processing to the current `speech_final` handler instead of the removed legacy path
2. **Storage**: Consider if you need persistent storage or just real-time processing
3. **Performance**: Word-level data significantly increases data volume
4. **Integration**: Design how word-level data flows into your existing scorecard pipeline

## Git Reference

- **Removal commit**: `e6b2f14` - "Remove legacy Deepgram message handling and word-level detail tracking"
- **Tag**: `word-level-detail-removal`
- **Branch**: `feature/refactor-for-deepgram-smart-listen`

To restore this functionality, you would need to:
1. Add word processing back to the modern `speech_final` message handler
2. Decide on the data structure for word storage/processing
3. Integrate word-level data into your existing scorecard components

The word-level feature could significantly enhance the granularity and precision of your language learning assessment system.