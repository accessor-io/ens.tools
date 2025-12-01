#!/bin/bash

# Continuous Build Script (Shell Version)
# Keeps building the app until it succeeds or max retries reached

set -e

# Configuration
MAX_RETRIES=${MAX_RETRIES:-100}
RETRY_DELAY=${RETRY_DELAY:-5}  # seconds
BUILD_COMMAND=${1:-"npm run build"}
LOG_FILE="$(dirname "$0")/../build.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging function
log() {
    local message=$1
    local color=${2:-NC}
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_message="[${timestamp}] ${message}"
    
    echo -e "${!color}${log_message}${NC}"
    echo "${log_message}" >> "$LOG_FILE"
}

# Clear previous log
> "$LOG_FILE"

log "============================================================" "BOLD"
log "Continuous Build Script Started" "BOLD"
log "Build Command: ${BUILD_COMMAND}" "BLUE"
log "Max Retries: ${MAX_RETRIES}" "BLUE"
log "Retry Delay: ${RETRY_DELAY}s" "BLUE"
log "============================================================" "BOLD"

attempt=0
last_error=""

while [ $attempt -lt $MAX_RETRIES ]; do
    attempt=$((attempt + 1))
    log "" "NC"
    log "--- Build Attempt ${attempt}/${MAX_RETRIES} ---" "YELLOW"
    
    if eval "$BUILD_COMMAND" 2>&1 | tee -a "$LOG_FILE"; then
        log "" "NC"
        log "============================================================" "GREEN"
        log "BUILD SUCCESSFUL!" "GREEN"
        log "Completed in ${attempt} attempt(s)" "GREEN"
        log "============================================================" "GREEN"
        exit 0
    else
        last_error="Build command failed"
        log "Build failed on attempt ${attempt}" "RED"
        # Play bell sound on error
        echo -ne '\a'  # Bell character
        printf '\x07'  # Alternative bell
        
        # On macOS, play system sound
        if [[ "$OSTYPE" == "darwin"* ]]; then
            afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log "Waiting ${RETRY_DELAY} seconds before retry..." "YELLOW"
            sleep $RETRY_DELAY
        fi
    fi
done

# All retries failed
# Play bell sounds for final failure
echo -ne '\a\a'  # Double bell
printf '\x07\x07'  # Alternative double bell

# On macOS, play system sound
if [[ "$OSTYPE" == "darwin"* ]]; then
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
    sleep 0.5
    afplay /System/Library/Sounds/Glass.aiff 2>/dev/null || true
fi

log "" "NC"
log "============================================================" "RED"
log "BUILD FAILED AFTER ALL RETRIES" "RED"
log "Attempted ${MAX_RETRIES} times" "RED"
if [ -n "$last_error" ]; then
    log "Last Error: ${last_error}" "RED"
fi
log "============================================================" "RED"
log "Full log saved to: ${LOG_FILE}" "YELLOW"
exit 1

