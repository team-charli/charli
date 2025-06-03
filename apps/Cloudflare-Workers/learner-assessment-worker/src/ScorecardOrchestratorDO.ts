// ~/apps/learner-assessment-worker/src/ScorecardOrchestratorDO.ts

import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { DOEnv } from './env';

interface AnalyzedMistake {
  text: string;
  correction: string;
  type: string;
}

/***** local helper types *****/
interface BellEvent {
  peerId: string;
  ts: number; // epoch‑ms when teacher clicked
}
interface MissedLine {
  text: string;
  start: number; // sec offset in session
}

/***** Durable Object *****/
export class ScorecardOrchestratorDO extends DurableObject<DOEnv> {
  private app = new Hono<{ Bindings: DOEnv }>();

  constructor(state: DurableObjectState, env: DOEnv) {
    super(state, env);

    /**************** POST /scorecard/:roomId ****************/
    this.app.post('/scorecard/:roomId', async (c) => {
      const roomId = c.req.param('roomId');
      console.log(`🎯 [SCORECARD-ORCHESTRATOR] 🚀 SCORECARD REQUEST RECEIVED - roomId: ${roomId}`);
      console.log(`🎯 [SCORECARD-ORCHESTRATOR] Request URL: ${c.req.url}`);
      console.log(`🎯 [SCORECARD-ORCHESTRATOR] Request method: ${c.req.method}`);

      /* -------------------- parse body ------------------- */
      let parsedBody;
      try {
        parsedBody = await c.req.json();
        console.log(`🎯 [SCORECARD-ORCHESTRATOR] ✅ Request body parsed successfully`);
        console.log(`🎯 [SCORECARD-ORCHESTRATOR] Body keys: ${Object.keys(parsedBody).join(', ')}`);
      } catch (error) {
        console.error(`🎯 [SCORECARD-ORCHESTRATOR] ❌ CRITICAL: Failed to parse request body:`, error);
        return c.json({ error: 'Invalid JSON in request body' }, 400);
      }

      const {
        learnerSegments,
        fullTranscript,
        session_id,
        learner_id,
        teacher_id,
        bellEvents = [],
        sessionStartMs
      }: {
        learnerSegments: { start: number; text: string }[];
        fullTranscript: string;
        session_id: number;
        learner_id: number;
        teacher_id: number;
        bellEvents?: BellEvent[];
        sessionStartMs?: number;
      } = parsedBody;

      console.log(`🎯 [SCORECARD-ORCHESTRATOR] 📊 Request data:`, {
        roomId,
        session_id,
        learner_id,
        teacher_id,
        learnerSegmentsCount: learnerSegments?.length || 0,
        fullTranscriptLength: fullTranscript?.length || 0,
        bellEventsCount: bellEvents?.length || 0,
        sessionStartMs
      });

      /* ---------------- learner‑side scoring ------------- */
      console.log(`[ScorecardOrchestratorDO] Starting scorecard generation for room ${roomId}, session ${session_id}`);
      console.log(`[ScorecardOrchestratorDO] Received ${learnerSegments.length} learner segments, teacher_id: ${teacher_id || 'null (robo-mode)'}`);
      
      const learnerUtterances = learnerSegments.map((s) => s.text);
      if (!learnerUtterances.length) {
        console.error(`[ScorecardOrchestratorDO] ERROR: No learner utterances provided for session ${session_id}`);
        return c.json({ error: 'No learner utterances provided' }, 400);
      }
      
      console.log(`[ScorecardOrchestratorDO] Processing ${learnerUtterances.length} learner utterances`);

      // 1️⃣ detect learner mistakes
      console.log(`[ScorecardOrchestratorDO] Starting mistake detection pipeline`);
      const detectorStub = this.env.MISTAKE_DETECTOR_DO.get(
        this.env.MISTAKE_DETECTOR_DO.idFromName(roomId)
      );
      
      let detectorRes, mistakes;
      try {
        detectorRes = await detectorStub.fetch('http://mistake-detector/detect', {
          method: 'POST',
          body: JSON.stringify({ learnerUtterances, fullTranscript }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!detectorRes.ok) {
          throw new Error(`Detector returned ${detectorRes.status}: ${detectorRes.statusText}`);
        }
        
        const detectorResult = await detectorRes.json() as any;
        mistakes = detectorResult.mistakes;
        console.log(`[ScorecardOrchestratorDO] Mistake detection completed: ${mistakes?.length || 0} mistakes found`);
      } catch (error) {
        console.error(`[ScorecardOrchestratorDO] CRITICAL ERROR in mistake detection:`, error);
        throw new Error(`Mistake detection pipeline failed: ${error}`);
      }

      // 2️⃣ analyze mistakes
      console.log(`[ScorecardOrchestratorDO] Starting mistake analysis for ${mistakes?.length || 0} detected mistakes`);
      const analyzerStub = this.env.MISTAKE_ANALYZER_DO.get(
        this.env.MISTAKE_ANALYZER_DO.idFromName(roomId)
      );
      
      let analyzerRes, analyzedMistakes;
      try {
        analyzerRes = await analyzerStub.fetch('http://mistake-analyzer/analyze', {
          method: 'POST',
          body: JSON.stringify({ detectedMistakes: mistakes }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!analyzerRes.ok) {
          throw new Error(`Analyzer returned ${analyzerRes.status}: ${analyzerRes.statusText}`);
        }
        
        const analyzerResult = await analyzerRes.json() as { analyzedMistakes: AnalyzedMistake[] };
        analyzedMistakes = analyzerResult.analyzedMistakes;
        console.log(`[ScorecardOrchestratorDO] Mistake analysis completed: ${analyzedMistakes?.length || 0} mistakes analyzed`);
      } catch (error) {
        console.error(`[ScorecardOrchestratorDO] CRITICAL ERROR in mistake analysis:`, error);
        throw new Error(`Mistake analysis pipeline failed: ${error}`);
      }

      // 3️⃣ learner aggregate scores
      const utteranceCount = learnerUtterances.length;
      const uniqueUtterancesWithError = new Set(analyzedMistakes.map((m) => m.text)).size;
      const languageAccuracy = Math.round(((utteranceCount - uniqueUtterancesWithError) / utteranceCount) * 100);
      const conversationDifficulty = Math.max(2, Math.min(10, Math.ceil(utteranceCount / 4)));

      // 4️⃣ enrichment pipeline
      console.log(`[ScorecardOrchestratorDO] Starting enrichment pipeline for learner_id ${learner_id}`);
      const enrichmentStub = this.env.MISTAKE_ENRICHER_PIPELINE_DO.get(
        this.env.MISTAKE_ENRICHER_PIPELINE_DO.idFromName(roomId)
      );
      
      let enrichmentRes, enrichedMistakes;
      try {
        enrichmentRes = await enrichmentStub.fetch('http://mistake-enricher-pipeline/enrich', {
          method: 'POST',
          body: JSON.stringify({ learner_id, analyzedMistakes }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!enrichmentRes.ok) {
          throw new Error(`Enrichment returned ${enrichmentRes.status}: ${enrichmentRes.statusText}`);
        }
        
        const enrichmentResult = await enrichmentRes.json() as any;
        enrichedMistakes = enrichmentResult.enrichedMistakes;
        console.log(`[ScorecardOrchestratorDO] Enrichment pipeline completed: ${enrichedMistakes?.length || 0} mistakes enriched`);
      } catch (error) {
        console.error(`[ScorecardOrchestratorDO] CRITICAL ERROR in enrichment pipeline:`, error);
        throw new Error(`Enrichment pipeline failed: ${error}`);
      }

      // 5️⃣ persist learner scorecard
      console.log(`[ScorecardOrchestratorDO] Persisting learner scorecard - accuracy: ${languageAccuracy}%, difficulty: ${conversationDifficulty}, mistakes: ${enrichedMistakes?.length || 0}`);
      const persisterStub = this.env.SCORECARD_PERSISTER_DO.get(
        this.env.SCORECARD_PERSISTER_DO.idFromName(roomId)
      );
      
      try {
        const persistRes = await persisterStub.fetch('http://scorecard-persister/persist', {
          method: 'POST',
          body: JSON.stringify({
            session_id,
            learner_id,
            analyzedMistakes: enrichedMistakes,
            conversationDifficulty,
            languageAccuracy
          }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!persistRes.ok) {
          throw new Error(`Persister returned ${persistRes.status}: ${persistRes.statusText}`);
        }
        
        console.log(`[ScorecardOrchestratorDO] ✅ Learner scorecard successfully persisted for session ${session_id}`);
      } catch (error) {
        console.error(`[ScorecardOrchestratorDO] CRITICAL ERROR persisting learner scorecard:`, error);
        throw new Error(`Scorecard persistence failed: ${error}`);
      }

      /* ---------------- teacher bell‑accuracy scoring ---- */
      let teacherScorecard = null;
      
      // Only process teacher scorecard if teacher_id is provided (skip for robo-mode)
      if (teacher_id) {
        console.log(`[ScorecardOrchestratorDO] Processing teacher scorecard for teacher_id: ${teacher_id}`);
        const startByText = new Map(learnerSegments.map((s) => [s.text, s.start]));

        type MistakeWithTime = { text: string; start: number };
        const mistakeTimes: MistakeWithTime[] = analyzedMistakes
          .map((m) => ({ text: m.text, start: startByText.get(m.text) ?? -1 }))
          .filter((m) => m.start >= 0);

        // convert bell timestamps to session‑relative seconds using true session start time
        // The key insight: learnerSegments.start values are relative to session start (seconds)
        // while bellEvents.ts values are absolute epoch timestamps (ms)
        // We need to establish a common reference point
        let sessionTimelineOffsetMs: number;
        
        if (sessionStartMs) {
          // Use provided session start time (ideal case from session-time-tracker)
          sessionTimelineOffsetMs = sessionStartMs;
          console.log(`[TeacherScorecard] Using provided sessionStartMs: ${sessionStartMs}`);
        } else if (learnerSegments.length > 0 && bellEvents.length > 0) {
          // Better approach: Find correlation between segments and bells to establish timeline
          // Look for the segment that occurs closest in time to any bell event
          let bestCorrelation = { segmentStart: 0, bellMs: 0, timeDiff: Infinity };
          
          for (const segment of learnerSegments) {
            for (const bell of bellEvents) {
              // For each segment-bell pair, calculate what the session start would be
              // if this segment corresponds to this bell timing
              const impliedSessionStart = bell.ts - (segment.start * 1000);
              
              // Check how well this aligns other segments with other bells
              let totalAlignment = 0;
              let alignmentCount = 0;
              
              for (const otherSegment of learnerSegments) {
                const segmentAbsoluteTime = impliedSessionStart + (otherSegment.start * 1000);
                for (const otherBell of bellEvents) {
                  const timeDiff = Math.abs(segmentAbsoluteTime - otherBell.ts);
                  if (timeDiff <= 5000) { // Within 5 seconds
                    totalAlignment += (5000 - timeDiff); // Higher score for closer alignment
                    alignmentCount++;
                  }
                }
              }
              
              if (alignmentCount > 0) {
                const avgAlignment = totalAlignment / alignmentCount;
                if (avgAlignment > bestCorrelation.timeDiff) {
                  bestCorrelation = {
                    segmentStart: segment.start,
                    bellMs: bell.ts,
                    timeDiff: avgAlignment
                  };
                }
              }
            }
          }
          
          sessionTimelineOffsetMs = bestCorrelation.bellMs - (bestCorrelation.segmentStart * 1000);
          console.log(`[TeacherScorecard] Calculated sessionStart via correlation: segment ${bestCorrelation.segmentStart}s -> bell ${bestCorrelation.bellMs}ms = session start ${sessionTimelineOffsetMs}`);
        } else {
          // Fallback: Use first bell as session start (maintains backward compatibility)
          sessionTimelineOffsetMs = bellEvents.length > 0 ? Math.min(...bellEvents.map((b) => b.ts)) : Date.now();
          console.log(`[TeacherScorecard] Fallback to first bell timestamp: ${sessionTimelineOffsetMs}`);
        }
        
        const bellTimesInSec = bellEvents.map((b) => (b.ts - sessionTimelineOffsetMs) / 1000);
        console.log(`[TeacherScorecard] Bell times in session seconds:`, bellTimesInSec);
        console.log(`[TeacherScorecard] Mistake times in session seconds:`, mistakeTimes.map(m => m.start));

        let correctBells = 0;
        let extraBells = 0;
        const missedOpportunities: MissedLine[] = [];

        // For each mistake, check if teacher rang bell within ±3 sec window
        mistakeTimes.forEach((mistake) => {
          const withinWindow = bellTimesInSec.some((bellTime) => Math.abs(bellTime - mistake.start) <= 3);
          if (withinWindow) {
            correctBells++;
          } else {
            missedOpportunities.push({ text: mistake.text, start: mistake.start });
          }
        });

        // Count extra bells (bells not near any mistake)
        bellTimesInSec.forEach((bellTime) => {
          const nearMistake = mistakeTimes.some((mistake) => Math.abs(bellTime - mistake.start) <= 3);
          if (!nearMistake) {
            extraBells++;
          }
        });

        const opportunities = mistakeTimes.length;
        const accuracyRatio = opportunities > 0 ? correctBells / opportunities : 1;

        // 6️⃣ persist teacher scorecard
        console.log(`[ScorecardOrchestratorDO] Persisting teacher scorecard - opportunities: ${opportunities}, correct: ${correctBells}, extra: ${extraBells}, accuracy: ${Math.round(accuracyRatio * 100)}%`);
        const teacherPersisterStub = this.env.TEACHER_SCORECARD_PERSISTER_DO.get(
          this.env.TEACHER_SCORECARD_PERSISTER_DO.idFromName(roomId)
        );
        
        try {
          const teacherPersistRes = await teacherPersisterStub.fetch('http://teacher-scorecard-persister/persist', {
            method: 'POST',
            body: JSON.stringify({
              session_id,
              teacher_id,
              opportunities,
              correct_bells: correctBells,
              extra_bells: extraBells,
              accuracy_ratio: accuracyRatio,
              missed: missedOpportunities
            }),
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!teacherPersistRes.ok) {
            throw new Error(`Teacher persister returned ${teacherPersistRes.status}: ${teacherPersistRes.statusText}`);
          }
          
          console.log(`[ScorecardOrchestratorDO] ✅ Teacher scorecard successfully persisted for session ${session_id}`);
        } catch (error) {
          console.error(`[ScorecardOrchestratorDO] CRITICAL ERROR persisting teacher scorecard:`, error);
          throw new Error(`Teacher scorecard persistence failed: ${error}`);
        }

        teacherScorecard = {
          opportunities,
          correctBells,
          extraBells,
          accuracyRatio: Math.round(accuracyRatio * 100),
          missedOpportunities
        };
      } else {
        console.log('[ScorecardOrchestratorDO] Skipping teacher scorecard - no teacher_id provided (likely robo-mode)');
      }

      /* -------------------- response ---------------------- */
      console.log(`[ScorecardOrchestratorDO] ✅ Scorecard generation completed successfully for session ${session_id}`);
      console.log(`[ScorecardOrchestratorDO] Final results - Learner accuracy: ${languageAccuracy}%, Teacher scorecard: ${teacherScorecard ? 'generated' : 'skipped (robo-mode)'}`);
      
      return c.json({
        roomId,
        scorecard: {
          conversationDifficulty,
          languageAccuracy,
          mistakes: enrichedMistakes
        },
        teacherScorecard
      });
    });
  }

  async fetch(req: Request) {
    return this.app.fetch(req);
  }
}