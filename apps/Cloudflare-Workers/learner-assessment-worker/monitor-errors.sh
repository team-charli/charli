#!/bin/bash
echo "🚨 CRITICAL ERRORS: Database failures, AI timeouts, persistence issues"
echo "Filter: CRITICAL|ERROR|failed|timeout|persistence.*failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "CRITICAL|ERROR|failed|timeout|persistence.*failed" --color=always
