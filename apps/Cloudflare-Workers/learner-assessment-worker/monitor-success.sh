#!/bin/bash
echo "✅ SUCCESS INDICATORS: Completed operations and confirmations"
echo "Filter: ✅|🎉|successfully|completed|generated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "✅|🎉|successfully|completed|generated" --color=always
