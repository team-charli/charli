// apps/learner-assessment-worker/src/TeacherScorecardPersisterDO.ts
import { DurableObject }         from 'cloudflare:workers';
import { Hono }                  from 'hono';
import { createClient }          from '@supabase/supabase-js';
import { Env }                   from './env';

export class TeacherScorecardPersisterDO extends DurableObject<Env> {
  private app  = new Hono();
  private db   = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY);

  constructor(state: DurableObjectState, env: Env) { super(state, env);

    this.app.post("/persist", async c => {
      const sc = await c.req.json<{
        session_id: number;
        teacher_id: number;
        opportunities: number;
        correct_bells: number;
        extra_bells: number;
        accuracy_ratio: number;
        missed: { text: string; start: number }[];
      }>();

      // 1) main row
      const { error: e1 } = await this.db.from("teacher_scorecards").insert({
        session_id      : sc.session_id,
        teacher_id      : sc.teacher_id,
        opportunities   : sc.opportunities,
        correct_bells   : sc.correct_bells,
        extra_bells     : sc.extra_bells,
        accuracy_ratio  : sc.accuracy_ratio
      });
      if (e1) return c.json({ error: e1.message }, 500);

      // 2) missed-opportunity detail
      if (sc.missed.length) {
        const rows = sc.missed.map(m => ({
          session_id : sc.session_id,
          text       : m.text,
          start_time : m.start
        }));
        const { error: e2 } = await this.db.from("teacher_missed_lines").insert(rows);
        if (e2) return c.json({ error: e2.message }, 500);
      }

      return c.json({ ok: true });
    });
  }

  async fetch(req: Request) { return this.app.fetch(req); }
}