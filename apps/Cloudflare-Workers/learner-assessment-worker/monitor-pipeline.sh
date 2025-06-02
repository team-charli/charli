#!/bin/bash
echo "🔄 PIPELINE STAGES: Detection, analysis, enrichment, persistence"
echo "Filter: processing|enrichment|detector|analyzer|orchestrator|persister"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "processing|enrichment|detector|analyzer|orchestrator|persister" --color=always
