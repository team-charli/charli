#!/bin/bash
echo "📊 SCORECARD FOCUS: Assessment and mistake tracking"
echo "Filter: scorecard|assessment|mistake|error"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "scorecard|assessment|mistake|error" --color=always
