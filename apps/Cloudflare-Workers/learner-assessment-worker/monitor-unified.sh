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
    local script_name="$(basename "$0")"
    echo "${BOLD}Unified Learner Assessment Monitor${RESET}"
    echo "Usage: $script_name [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --scorecard     Focus on scorecard operations (default)"
    echo "  -e, --errors        Show only critical errors"
    echo "  -r, --robo          Show robo-teacher specific logs"
    echo "  -p, --pipeline      Show pipeline stage details"
    echo "  -a, --all           Show all logs (no filtering)"
    echo "  -l, --log-file FILE Save logs to file (use 'auto' for timestamped file)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $script_name                  # Default scorecard monitoring"
    echo "  $script_name --errors         # Error monitoring only"
    echo "  $script_name --all            # All logs with color coding"
    echo "  $script_name -s -l auto       # Scorecard logs to ~/tmp/learner-scorecard-logs/"
    echo "  $script_name -s -l /tmp/debug.log  # Scorecard logs to specific file"
}

# Default mode
MODE="scorecard"
LOG_FILE=""

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
        -l|--log-file)
            if [[ -n "$2" && "$2" != -* ]]; then
                LOG_FILE="$2"
                shift 2
            else
                echo "Error: --log-file requires an argument"
                show_usage
                exit 1
            fi
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
            echo "scorecard|assessment|mistake|error|✅|🎉|successfully|completed|generated|🚀.*Initiating|ScorecardOrchestratorDO|Starting.*mistake|Starting.*enrichment|Starting.*persistence|Persisting.*scorecard|transcribeAndDiarizeAll|end-session.*error|Missing required IDs|No segments found|scorecard.*null|null.*scorecard|🏁.*Session.*ending|🎯.*WORKER-INDEX.*END-SESSION|🎯.*DO-FETCH.*END-SESSION|🎯.*HANDLE-AUDIO.*END-SESSION|🎯.*END-SESSION"
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
    # Handle auto log file naming
    if [[ "$LOG_FILE" == "auto" ]]; then
        local log_dir="$HOME/tmp/learner-scorecard-logs"
        mkdir -p "$log_dir"
        LOG_FILE="$log_dir/monitor-$(date +%Y%m%d-%H%M%S)-${MODE}.log"
        echo "Auto-generated log file: $LOG_FILE"
    elif [[ -n "$LOG_FILE" ]]; then
        # Expand tilde if present
        LOG_FILE="${LOG_FILE/#\~/$HOME}"
        mkdir -p "$(dirname "$LOG_FILE")"
        echo "Logging to: $LOG_FILE"
    fi
    
    echo ""
    echo "$(get_mode_description)"
    echo "Filter: $(get_filter_pattern)"
    if [[ -n "$LOG_FILE" ]]; then
        echo "${CYAN}💾 Logging to: $LOG_FILE${RESET}"
    fi
    echo "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
    echo "${GRAY}Press Ctrl+C to stop monitoring${RESET}"
    echo ""

    # Build the monitoring pipeline
    local pipeline_cmd
    if [[ $MODE == "all" ]]; then
        pipeline_cmd="bunx wrangler tail learner-assessment-worker --format pretty | rg -v '/audio/' | colorize_logs"
    else
        pipeline_cmd="bunx wrangler tail learner-assessment-worker --format pretty | rg -i \"$(get_filter_pattern)\" | colorize_logs"
    fi
    
    # Execute with or without logging
    if [[ -n "$LOG_FILE" ]]; then
        # Log to file and display on screen (tee)
        eval "$pipeline_cmd" | tee "$LOG_FILE"
    else
        # Display only
        eval "$pipeline_cmd"
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