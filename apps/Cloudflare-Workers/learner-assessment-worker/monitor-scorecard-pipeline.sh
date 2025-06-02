#!/bin/bash

# Comprehensive Learner Assessment Pipeline Monitoring Script
# This script sets up multiple monitoring sessions for scorecard generation

echo "🔍 Starting comprehensive learner assessment pipeline monitoring..."
echo "📍 Working directory: $(pwd)"
echo "⏰ Started at: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [[ ! -f "wrangler.jsonc" ]]; then
    echo -e "${RED}❌ Error: Not in learner-assessment-worker directory${NC}"
    echo "Please run this script from: ~/Projects/charli/apps/Cloudflare-Workers/learner-assessment-worker"
    exit 1
fi

echo -e "${GREEN}✅ Verified location: learner-assessment-worker directory${NC}"
echo ""

# Function to create monitoring command files
create_monitor_scripts() {
    echo -e "${BLUE}📝 Creating monitoring command scripts...${NC}"
    
    # Primary monitoring command (excluding audio spam)
    cat > monitor-primary.sh << 'EOF'
#!/bin/bash
echo "🎯 PRIMARY MONITOR: All logs except audio processing"
echo "Filter: Excludes '/audio/' to reduce noise"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -v '/audio/' --color=always
EOF

    # Scorecard-specific monitoring
    cat > monitor-scorecard.sh << 'EOF'
#!/bin/bash
echo "📊 SCORECARD FOCUS: Assessment and mistake tracking"
echo "Filter: scorecard|assessment|mistake|error"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "scorecard|assessment|mistake|error" --color=always
EOF

    # Pipeline stage monitoring
    cat > monitor-pipeline.sh << 'EOF'
#!/bin/bash
echo "🔄 PIPELINE STAGES: Detection, analysis, enrichment, persistence"
echo "Filter: processing|enrichment|detector|analyzer|orchestrator|persister"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "processing|enrichment|detector|analyzer|orchestrator|persister" --color=always
EOF

    # Robo-mode specific monitoring
    cat > monitor-robo.sh << 'EOF'
#!/bin/bash
echo "🤖 ROBO MODE: Thinking time, utterances, and fragments"
echo "Filter: robo|thinking.*time|utterance|fragment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "robo|thinking.*time|utterance|fragment" --color=always
EOF

    # Critical errors and failures
    cat > monitor-errors.sh << 'EOF'
#!/bin/bash
echo "🚨 CRITICAL ERRORS: Database failures, AI timeouts, persistence issues"
echo "Filter: CRITICAL|ERROR|failed|timeout|persistence.*failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "CRITICAL|ERROR|failed|timeout|persistence.*failed" --color=always
EOF

    # Success indicators
    cat > monitor-success.sh << 'EOF'
#!/bin/bash
echo "✅ SUCCESS INDICATORS: Completed operations and confirmations"
echo "Filter: ✅|🎉|successfully|completed|generated"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bunx wrangler tail learner-assessment-worker --format pretty | bunx rg -i "✅|🎉|successfully|completed|generated" --color=always
EOF

    # Make all scripts executable
    chmod +x monitor-*.sh
    
    echo -e "${GREEN}✅ Created 6 monitoring scripts${NC}"
}

# Function to display usage instructions
show_usage() {
    echo -e "${CYAN}📖 MONITORING SETUP COMPLETE${NC}"
    echo ""
    echo -e "${YELLOW}Available monitoring commands:${NC}"
    echo -e "${PURPLE}1. Primary Monitor:${NC}     ./monitor-primary.sh"
    echo -e "${PURPLE}2. Scorecard Focus:${NC}     ./monitor-scorecard.sh"
    echo -e "${PURPLE}3. Pipeline Stages:${NC}     ./monitor-pipeline.sh"
    echo -e "${PURPLE}4. Robo Mode:${NC}           ./monitor-robo.sh"
    echo -e "${PURPLE}5. Critical Errors:${NC}     ./monitor-errors.sh"
    echo -e "${PURPLE}6. Success Indicators:${NC}  ./monitor-success.sh"
    echo ""
    echo -e "${YELLOW}💡 Pro Tips:${NC}"
    echo "• Run multiple monitors in separate terminal windows for comprehensive coverage"
    echo "• Start with Primary Monitor + Scorecard Focus for general monitoring"
    echo "• Use Pipeline Stages monitor to debug specific workflow failures"
    echo "• Monitor Success Indicators to confirm scorecard generation"
    echo "• Check Critical Errors monitor if things seem to be failing"
    echo ""
    echo -e "${YELLOW}🎯 Key Success Indicators to Watch:${NC}"
    echo "• '[LearnerAssessmentDO] 🚀 Initiating scorecard generation pipeline'"
    echo "• '[ScorecardOrchestratorDO] Starting scorecard generation'"
    echo "• '[ScorecardOrchestratorDO] ✅ Scorecard generation completed successfully'"
    echo "• '[ScorecardPersisterDO] 🎉 Complete persistence success'"
    echo ""
    echo -e "${YELLOW}❌ Critical Failure Patterns:${NC}"
    echo "• 'CRITICAL ERROR' - Database or persistence failures"
    echo "• 'Missing required IDs' - Session setup problems"
    echo "• 'Scorecard generation failed' - Pipeline breakdown"
    echo "• 'No analyzed mistakes provided' - Detection pipeline failure"
    echo ""
    echo -e "${GREEN}🚀 Ready to monitor learner assessment pipeline!${NC}"
}

# Main execution
create_monitor_scripts
show_usage

echo ""
echo -e "${BLUE}🔍 To start monitoring now, run:${NC}"
echo -e "${CYAN}  ./monitor-primary.sh${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember: Monitor for at least one complete robo-teacher session${NC}"
echo -e "${YELLOW}   to validate end-to-end scorecard generation success!${NC}"