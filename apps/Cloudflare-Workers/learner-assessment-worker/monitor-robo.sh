#!/bin/bash
echo "🤖 ROBO MODE: Thinking time, utterances, and fragments"
echo "Filter: robo|thinking.*time|utterance|fragment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "robo|thinking.*time|utterance|fragment" --color=always
