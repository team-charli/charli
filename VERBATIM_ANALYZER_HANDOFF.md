# VerbatimAnalyzer Fix - Technical Handoff Document

## 🎯 Mission
Fix the VerbatimAnalyzer to **accurately report transcript fidelity**, **flag only real auto-corrections**, and **assign sensible scores**. Currently producing 0% scores due to mathematical bugs and over-detection of false auto-corrections.

## 📊 Current Problem Analysis

### Root Causes of 0% Scores
1. **False auto-correction hits**: 460 corrections detected from 145 transcripts (3+ per transcript)
2. **Broken penalty math**: `score * (1 - 69)` = negative scores clamped to 0
3. **Wrong transcript selection**: Comparing against partial interim transcripts with <50% similarity

### Current Broken Behavior
```
Input: "Hola, yo jugimos fútbol ayer" (learner with morphological error)
Expected: 90%+ score if Deepgram preserves "jugimos" 
Actual: 0% score due to 460 false auto-correction penalties
```

## 🎯 Success Criteria

| Case | Learner Says | Deepgram Returns | Expected Score |
|------|--------------|------------------|----------------|
| 1 | "Hola, yo **jugimos** fútbol…" (error) | "…yo **jugimos** fútbol…" (preserved) | ≥ 90% |
| 2 | "Hola, yo **jugimos** fútbol…" (error) | "…yo **jugamos** fútbol…" (corrected) | ≤ 50% |
| 3 | "Los estudiantes **está**…" (error) | "…estudiantes **están**…" (corrected) | ≤ 50% |
| 4 | "Texto correcto sin errores" (perfect) | identical transcript | ≥ 95% |
| 5 | Normal interim → final progression | score reflects final, no penalty | ≥ 90% |

## 🔧 Implementation Plan

### Phase 1: Test Infrastructure (TDD Approach)

#### 1.1 Create Test Fixtures Directory
```bash
mkdir -p apps/Cloudflare-Workers/learner-assessment-worker/test/__fixtures__
```

Create these JSON fixtures (hand-crafted or from real data):

**`jugimos-preserved.json`** - Error preserved (should score ≥90%)
```json
[
  { "messageType": "interim", "text": "hola yo jug", "confidence": 0.74, "timestamp": 0 },
  { "messageType": "interim", "text": "hola yo jugimos fút", "confidence": 0.79, "timestamp": 500 },
  { "messageType": "is_final", "text": "hola yo jugimos fútbol ayer", "confidence": 0.92, "timestamp": 1100 }
]
```

**`jugimos-corrected.json`** - Auto-corrected (should score ≤50%)
```json
[
  { "messageType": "interim", "text": "hola yo jug", "confidence": 0.70, "timestamp": 0 },
  { "messageType": "interim", "text": "hola yo jugimos fút", "confidence": 0.77, "timestamp": 600 },
  { "messageType": "is_final", "text": "hola yo jugamos fútbol ayer", "confidence": 0.94, "timestamp": 1200 }
]
```

**`embarazada-preserved.json`** - False cognate preserved
```json
[
  { "messageType": "interim", "text": "estoy muy", "confidence": 0.88, "timestamp": 0 },
  { "messageType": "is_final", "text": "estoy muy embarazada por la situación", "confidence": 0.91, "timestamp": 800 }
]
```

**`perfect-transcript.json`** - Perfect transcription
```json
[
  { "messageType": "interim", "text": "ayer comimos en", "confidence": 0.95, "timestamp": 0 },
  { "messageType": "is_final", "text": "ayer comimos en un restaurante muy bueno", "confidence": 0.97, "timestamp": 1000 }
]
```

**`interim-final-normal.json`** - Normal progression (no penalty)
```json
[
  { "messageType": "interim", "text": "los", "confidence": 0.85, "timestamp": 0 },
  { "messageType": "interim", "text": "los estudiantes", "confidence": 0.90, "timestamp": 300 },
  { "messageType": "is_final", "text": "los estudiantes están muy confundidos", "confidence": 0.95, "timestamp": 800 }
]
```

#### 1.2 Create Test Files

**`test/verbatim-score-preserved-error.spec.ts`**
```typescript
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import preservedFixture from './__fixtures__/jugimos-preserved.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'morphological-test-001')!;

test('morphological error preserved → high verbatim score', () => {
  const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
    script,
    1, // learnerTurnNumber
    preservedFixture as any
  );

  expect(result.verbatimScore).toBeGreaterThanOrEqual(90);
  expect(result.autoCorrectionInstances.length).toBeLessThanOrEqual(1);
  expect(result.summary).toContain('Excellent') || expect(result.summary).toContain('Good');
});
```

**`test/verbatim-score-auto-correct.spec.ts`**
```typescript
import { VerbatimAnalyzer } from '../src/VerbatimAnalyzer';
import { DICTATION_SCRIPTS } from '../src/DictationScripts';
import correctedFixture from './__fixtures__/jugimos-corrected.json';

const script = DICTATION_SCRIPTS.find(s => s.id === 'morphological-test-001')!;

test('morphological error auto-corrected → low verbatim score', () => {
  const result = VerbatimAnalyzer.analyzeDictationScriptVerbatimness(
    script,
    1, // learnerTurnNumber  
    correctedFixture as any
  );

  expect(result.verbatimScore).toBeLessThanOrEqual(50);
  expect(result.autoCorrectionInstances.length).toBeGreaterThanOrEqual(1);
  expect(result.autoCorrectionInstances[0].correctionType).toBe('grammar');
});
```

**`test/verbatim-score-subject-verb.spec.ts`**
```typescript
// Test for "estudiantes está" → "estudiantes están" correction
// Use script 'grammar-structure-test-003', turn 3
```

**`test/verbatim-score-perfect-text.spec.ts`**
```typescript
// Test perfect transcript against clean expected text
// Should score ≥95%
```

**`test/verbatim-score-interim-final.spec.ts`**
```typescript
// Test normal interim progression doesn't trigger false penalties
// Should score ≥90%, autoCorrectionInstances.length should be 0
```

### Phase 2: Core Algorithm Fixes

#### 2.1 Fix Transcript Selection Logic

**Current Problem**: `bestMatch` is chosen from ALL transcripts (including partial interims)
**Fix**: Only use the most authoritative transcript

```typescript
// In analyzeDictationScriptVerbatimness(), replace bestMatch selection:
private static selectBestTranscript(transcripts: TranscriptComparison[]): TranscriptComparison {
  // Priority: last is_final > last speech_final > last interim
  const finals = transcripts.filter(t => t.messageType === 'is_final');
  if (finals.length > 0) {
    return finals[finals.length - 1]; // Last is_final
  }
  
  const speechFinals = transcripts.filter(t => t.messageType === 'speech_final');
  if (speechFinals.length > 0) {
    return speechFinals[speechFinals.length - 1];
  }
  
  // Fallback to last interim
  return transcripts[transcripts.length - 1];
}
```

#### 2.2 Rewrite calculateVerbatimScore()

**Current Problem**: Broken percentage math causes negative scores
**Fix**: Graduated penalties with proper math

```typescript
private static calculateVerbatimScore(
  learnerTurn: DictationTurn,
  transcripts: TranscriptComparison[],
  autoCorrections: AutoCorrectionInstance[]
): number {
  if (transcripts.length === 0) return 0;

  // 1. Use best transcript (not bestMatch from all)
  const bestTranscript = this.selectBestTranscript(transcripts);
  
  // 2. Base score from similarity
  let score = bestTranscript.similarity * 100;

  // 3. Apply graduated penalties per correction type
  for (const correction of autoCorrections) {
    switch (correction.correctionType) {
      case 'grammar': score -= 20; break;
      case 'vocabulary': score -= 15; break; 
      case 'pronunciation': score -= 10; break;
      case 'structure': score -= 25; break;
    }
  }

  // 4. Add bonuses for preserved learner characteristics
  const expectedLower = learnerTurn.expectedText.toLowerCase();
  const actualLower = bestTranscript.actualText.toLowerCase();
  
  let bonus = 0;
  if (expectedLower.includes('eh') && actualLower.includes('eh')) bonus += 5;
  if (expectedLower.includes('...') && actualLower.includes('...')) bonus += 5;
  if (expectedLower.includes('como se dice') && actualLower.includes('como se dice')) bonus += 5;

  score += bonus;

  // 5. Cap in [0, 100]
  return Math.max(0, Math.min(100, Math.round(score)));
}
```

#### 2.3 Fix Static Pattern Detection

**Current Problem**: Checks all 145 transcripts, creates duplicate penalties
**Fix**: Only check final transcript once per pattern

```typescript
private static detectAutoCorrections(
  learnerTurn: DictationTurn,
  transcripts: TranscriptComparison[]
): AutoCorrectionInstance[] {
  const corrections: AutoCorrectionInstance[] = [];
  const expectedText = learnerTurn.expectedText.toLowerCase();
  
  // Only check the best (final) transcript
  const bestTranscript = this.selectBestTranscript(transcripts);
  const actualText = bestTranscript.actualText.toLowerCase();
  
  // Existing correctionPatterns array...
  const correctionPatterns = [
    { pattern: /\bjugimos\b/, correction: /jugamos/, type: 'grammar' as const, desc: 'Corrected malformed past tense' },
    { pattern: /\bcomiómos\b/, correction: /comimos/, type: 'grammar' as const, desc: 'Corrected malformed accent placement' },
    // ... rest of patterns
  ];

  for (const pattern of correctionPatterns) {
    // Both conditions must be true:
    // 1. Expected text contains the error
    // 2. Actual text contains the correction OR omits the error entirely
    if (expectedText.match(pattern.pattern) && !actualText.match(pattern.pattern)) {
      corrections.push({
        expectedPhrase: pattern.pattern.source,
        actualPhrase: bestTranscript.actualText,
        correctionType: pattern.type,
        description: pattern.desc
      });
      break; // Only count each pattern once
    }
  }

  return corrections;
}
```

#### 2.4 Fix Interim-Final Detection 

**Current Problem**: Nonsensical pairings like "mis hermanos comió" → "en el parque"
**Fix**: Require text overlap and stricter timing

```typescript
// Add helper method first:
private static hasSignificantTextOverlap(text1: string, text2: string): boolean {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return false;
  
  const commonWords = words1.filter(w => words2.includes(w));
  const overlapPercent = commonWords.length / Math.max(words1.length, words2.length);
  
  return overlapPercent >= 0.3; // At least 30% word overlap
}

private static detectInterimFinalDifferences(
  transcripts: TranscriptComparison[]
): AutoCorrectionInstance[] {
  const corrections: AutoCorrectionInstance[] = [];
  
  // Only check final transcripts
  const finalTranscripts = transcripts.filter(t => t.messageType === 'is_final');
  
  for (const final of finalTranscripts) {
    // Find interim transcripts within 1 second before this final
    const relatedInterims = transcripts.filter(t => 
      t.messageType === 'interim' && 
      t.timestamp <= final.timestamp &&
      t.timestamp > final.timestamp - 1000 // Within 1 second
    );
    
    if (relatedInterims.length > 0) {
      const lastInterim = relatedInterims[relatedInterims.length - 1];
      
      // Only flag if texts are related but significantly different
      const similarity = this.calculateSimilarity(
        lastInterim.actualText.toLowerCase(),
        final.actualText.toLowerCase()
      );
      
      const hasOverlap = this.hasSignificantTextOverlap(
        lastInterim.actualText,
        final.actualText
      );
      
      // More conservative: require overlap AND significant difference AND minimum length
      if (similarity < 0.6 && hasOverlap && lastInterim.actualText.length > 8) {
        corrections.push({
          expectedPhrase: lastInterim.actualText,
          actualPhrase: final.actualText,
          correctionType: 'structure',
          description: `Interim-final mismatch: "${lastInterim.actualText}" → "${final.actualText}"`
        });
      }
    }
  }

  return corrections;
}
```

#### 2.5 Add Deduplication

**Problem**: Same correction counted by both static patterns and interim-final detection
**Fix**: Hash-based deduplication

```typescript
private static deduplicateCorrections(corrections: AutoCorrectionInstance[]): AutoCorrectionInstance[] {
  const seen = new Set<string>();
  const deduplicated: AutoCorrectionInstance[] = [];
  
  for (const correction of corrections) {
    const hash = `${correction.expectedPhrase}→${correction.actualPhrase}`;
    if (!seen.has(hash)) {
      seen.add(hash);
      deduplicated.push(correction);
    }
  }
  
  return deduplicated;
}

// Use in analyzeDictationScriptVerbatimness():
const staticPatternCorrections = this.detectAutoCorrections(learnerTurn, transcriptComparisons);
const interimFinalCorrections = this.detectInterimFinalDifferences(transcriptComparisons);
const allCorrections = [...staticPatternCorrections, ...interimFinalCorrections];
const autoCorrectionInstances = this.deduplicateCorrections(allCorrections);
```

### Phase 3: Validation & Testing

#### 3.1 Run Test Suite
```bash
cd apps/Cloudflare-Workers/learner-assessment-worker
bun test
```

All 5 tests must pass with specified thresholds.

#### 3.2 Test Against Real Data
```bash
# Re-run the analysis that produced 46109a8d95-r2-analysis.md
# Expect dramatic improvement from 0% scores to realistic ranges
```

#### 3.3 Validate Score Distribution
- **Perfect transcripts**: 95-100%
- **Preserved errors**: 85-95% 
- **Auto-corrected errors**: 30-60%
- **Mixed transcripts**: 60-85%
- **Heavily corrupted**: 10-40%

## 🚨 Critical Notes

### DO NOT:
- Target any specific percentage range (like 60-70%)
- Revert to old commits (loses valuable pattern work)
- Hard-code test results
- Add artificial handicaps

### DO:
- Reflect actual verbatim preservation
- Only penalize confirmed auto-corrections
- Preserve all the Spanish error pattern detection work
- Use graduated penalties based on correction severity
- Maintain the DictationScript/DictationTurn interface improvements

## 📁 File Locations

- **Main file**: `apps/Cloudflare-Workers/learner-assessment-worker/src/VerbatimAnalyzer.ts`
- **Test configs**: Check for existing `vitest.config.mts` or similar
- **Dictation scripts**: `apps/Cloudflare-Workers/learner-assessment-worker/src/DictationScripts.ts`
- **Analysis output**: `46109a8d95-r2-analysis.md` (root level)

## 🎯 Acceptance Criteria

1. ✅ All 5 unit tests pass with specified score thresholds
2. ✅ No turn defaults to 0% unless similarity <0.2 AND ≥1 confirmed auto-correction  
3. ✅ Existing build/lint scripts run clean
4. ✅ Logic reflects real verbatimness, not arbitrary ranges
5. ✅ Auto-correction count drops from 460 to realistic 5-15 per session

## 🔍 Debugging Tips

If tests still fail:
1. **Check similarity calculation**: Is `calculateSimilarity()` working correctly?
2. **Verify transcript selection**: Is `selectBestTranscript()` choosing the right one?
3. **Debug pattern matching**: Are patterns matching expected text correctly?
4. **Trace penalty application**: Log score before/after each penalty
5. **Validate fixtures**: Do they match the actual DictationScript expected text?

## 📊 Expected Results

After fixes, re-running the analysis should show:
- **Average verbatim score**: 70-85% (realistic for mixed transcript quality)
- **Auto-correction count**: 5-15 per session (not 460)
- **Score distribution**: Bell curve centered around 75%, not all 0%
- **Edge cases handled**: Perfect transcripts = 95%+, heavily corrected = 30-50%

Success means **honest assessment of transcript fidelity** rather than artificially deflated scores.