#!/usr/bin/env zsh

# Unified Learner Assessment Monitoring Script
# Combines all monitoring patterns with color-coded output and filtering options

# Color definitions for zsh
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
BOLD='\033[1m'
RESET='\033[0m'

# Function to show usage
show_usage() {
    echo "${BOLD}Unified Learner Assessment Monitor${RESET}"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --scorecard     Focus on scorecard operations (default)"
    echo "  -e, --errors        Show only critical errors"
    echo "  -r, --robo          Show robo-teacher specific logs"
    echo "  -p, --pipeline      Show pipeline stage details"
    echo "  -a, --all           Show all logs (no filtering)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Default scorecard monitoring"
    echo "  $0 --errors         # Error monitoring only"
    echo "  $0 --all            # All logs with color coding"
}

# Default mode
MODE="scorecard"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--scorecard)
            MODE="scorecard"
            shift
            ;;
        -e|--errors)
            MODE="errors"
            shift
            ;;
        -r|--robo)
            MODE="robo"
            shift
            ;;
        -p|--pipeline)
            MODE="pipeline"
            shift
            ;;
        -a|--all)
            MODE="all"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to add color coding to log lines
colorize_logs() {
    # Color critical errors in red
    rg --color=never "CRITICAL|ERROR|failed|timeout" --passthru | \
    # Color success indicators in green
    rg --color=never "✅|🎉|successfully|completed|generated" --passthru | \
    # Color warnings in yellow
    rg --color=never "WARNING|WARN" --passthru | \
    # Color info/debug in gray
    rg --color=never "INFO|DEBUG" --passthru | \
    # Apply colors using sed
    sed -E \
        -e "s/(CRITICAL|ERROR|failed|timeout)/${RED}&${RESET}/gi" \
        -e "s/(✅|🎉|successfully|completed|generated)/${GREEN}&${RESET}/gi" \
        -e "s/(WARNING|WARN)/${YELLOW}&${RESET}/gi" \
        -e "s/(robo|thinking.*time|utterance|fragment)/${PURPLE}&${RESET}/gi" \
        -e "s/(scorecard|assessment|mistake)/${CYAN}&${RESET}/gi" \
        -e "s/(processing|enrichment|detector|analyzer|orchestrator|persister)/${BLUE}&${RESET}/gi"
}

# Function to get filter pattern based on mode
get_filter_pattern() {
    case $MODE in
        scorecard)
            echo "scorecard|assessment|mistake|error|✅|🎉|successfully|completed|generated|🚀.*Initiating|ScorecardOrchestratorDO|Starting.*mistake|Starting.*enrichment|Starting.*persistence|Persisting.*scorecard|transcribeAndDiarizeAll|end-session.*error|Missing required IDs|No segments found|scorecard.*null|null.*scorecard|🏁.*Session.*ending"
            ;;
        errors)
            echo "CRITICAL|ERROR|failed|timeout|persistence.*failed"
            ;;
        robo)
            echo "robo|thinking.*time|utterance|fragment"
            ;;
        pipeline)
            echo "processing|enrichment|detector|analyzer|orchestrator|persister|Starting.*mistake|Starting.*enrichment|Starting.*persistence|detection.*completed|analysis.*completed|enrichment.*completed|MISTAKE_DETECTOR_DO|MISTAKE_ANALYZER_DO|MISTAKE_ENRICHER_PIPELINE_DO|SCORECARD_PERSISTER_DO"
            ;;
        all)
            echo ".*"  # Match everything
            ;;
    esac
}

# Function to get mode description
get_mode_description() {
    case $MODE in
        scorecard)
            echo "${CYAN}📊 SCORECARD FOCUS${RESET}: Assessment, mistakes, and success indicators"
            ;;
        errors)
            echo "${RED}🚨 CRITICAL ERRORS${RESET}: Database failures, AI timeouts, persistence issues"
            ;;
        robo)
            echo "${PURPLE}🤖 ROBO MODE${RESET}: Thinking time, utterances, and fragments"
            ;;
        pipeline)
            echo "${BLUE}🔄 PIPELINE STAGES${RESET}: Detection, analysis, enrichment, persistence"
            ;;
        all)
            echo "${BOLD}🎯 ALL LOGS${RESET}: Complete monitoring with color coding (excludes audio)"
            ;;
    esac
}

# Main execution
main() {
    echo ""
    echo "$(get_mode_description)"
    echo "Filter: $(get_filter_pattern)"
    echo "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo "${GRAY}Press Ctrl+C to stop monitoring${RESET}"
    echo ""

    if [[ $MODE == "all" ]]; then
        # For all logs, exclude audio processing but include everything else
        bunx wrangler tail learner-assessment-worker --format pretty | \
        rg -v '/audio/' | \
        colorize_logs
    else
        # For specific modes, filter by pattern
        bunx wrangler tail learner-assessment-worker --format pretty | \
        rg -i "$(get_filter_pattern)" | \
        colorize_logs
    fi
}

# Check if we're in the correct directory
if [[ ! -f "wrangler.jsonc" ]] || [[ ! -d "src" ]]; then
    echo "${RED}Error: Please run this script from the learner-assessment-worker directory${RESET}"
    echo "Expected location: ~/Projects/charli/apps/Cloudflare-Workers/learner-assessment-worker"
    exit 1
fi

# Run main function
main