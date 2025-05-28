// ~/apps/learner-assessment-worker/src/ScorecardOrchestratorDO.ts

import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { DOEnv } from './env';

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

      /* -------------------- parse body ------------------- */
      const {
        learnerSegments,
        fullTranscript,
        session_id,
        learner_id,
        teacher_id,
        bellEvents = []
      }: {
        learnerSegments: { start: number; text: string }[];
        fullTranscript: string;
        session_id: number;
        learner_id: number;
        teacher_id: number;
        bellEvents?: BellEvent[];
      } = await c.req.json();

      /* ---------------- learner‑side scoring ------------- */
      const learnerUtterances = learnerSegments.map((s) => s.text);
      if (!learnerUtterances.length) {
        return c.json({ error: 'No learner utterances provided' }, 400);
      }

      // 1️⃣ detect learner mistakes
      const detectorStub = c.env.MISTAKE_DETECTOR_DO.get(
        c.env.MISTAKE_DETECTOR_DO.idFromName(roomId)
      );
      const detectorRes = await detectorStub.fetch('/detect', {
        method: 'POST',
        body: JSON.stringify({ learnerUtterances, fullTranscript }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { mistakes } = (await detectorRes.json()) as any;

      // 2️⃣ analyze mistakes
      const analyzerStub = c.env.MISTAKE_ANALYZER_DO.get(
        c.env.MISTAKE_ANALYZER_DO.idFromName(roomId)
      );
      const analyzerRes = await analyzerStub.fetch('/analyze', {
        method: 'POST',
        body: JSON.stringify({ detectedMistakes: mistakes }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { analyzedMistakes } = (await analyzerRes.json()) as any;

      // 3️⃣ learner aggregate scores
      const utteranceCount = learnerUtterances.length;
      const uniqueUtterancesWithError = new Set(analyzedMistakes.map((m: any) => m.text)).size;
      const languageAccuracy = Math.round(((utteranceCount - uniqueUtterancesWithError) / utteranceCount) * 100);
      const conversationDifficulty = Math.max(2, Math.min(10, Math.ceil(utteranceCount / 4)));

      // 4️⃣ enrichment pipeline
      const enrichmentStub = c.env.MISTAKE_ENRICHER_PIPELINE_DO.get(
        c.env.MISTAKE_ENRICHER_PIPELINE_DO.idFromName(roomId)
      );
      const enrichmentRes = await enrichmentStub.fetch('/enrich', {
        method: 'POST',
        body: JSON.stringify({ learner_id, analyzedMistakes }),
        headers: { 'Content-Type': 'application/json' }
      });
      const { enrichedMistakes } = (await enrichmentRes.json()) as any;

      // 5️⃣ persist learner scorecard
      const persisterStub = c.env.SCORECARD_PERSISTER_DO.get(
        c.env.SCORECARD_PERSISTER_DO.idFromName(roomId)
      );
      await persisterStub.fetch('/persist', {
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

      /* ---------------- teacher bell‑accuracy scoring ---- */
      let teacherScorecard = null;
      
      // Only process teacher scorecard if teacher_id is provided (skip for robo-mode)
      if (teacher_id) {
        console.log(`[ScorecardOrchestratorDO] Processing teacher scorecard for teacher_id: ${teacher_id}`);
        const startByText = new Map(learnerSegments.map((s) => [s.text, s.start]));

        type MistakeWithTime = { text: string; start: number };
        const mistakeTimes: MistakeWithTime[] = analyzedMistakes
          .map((m: any) => ({ text: m.text, start: startByText.get(m.text) ?? -1 }))
          .filter((m) => m.start >= 0);

        // convert bell timestamps to session‑relative seconds
        const sessionStartMs = bellEvents.length > 0 ? Math.min(...bellEvents.map((b) => b.ts)) : Date.now();
        const bellTimesInSec = bellEvents.map((b) => (b.ts - sessionStartMs) / 1000);

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
        const teacherPersisterStub = c.env.TEACHER_SCORECARD_PERSISTER_DO.get(
          c.env.TEACHER_SCORECARD_PERSISTER_DO.idFromName(roomId)
        );
        await teacherPersisterStub.fetch('/persist', {
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