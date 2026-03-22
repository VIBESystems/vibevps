#!/bin/bash
set -e

# Reset environment to avoid issues when launched from Node.js/PM2 web app
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export HOME="/root"
unset NODE_OPTIONS
unset NODE_PATH
unset NODE_ENV
# Clear all npm_* environment variables
for var in $(env | grep '^npm_' | cut -d= -f1); do
    unset "$var"
done

INSTALL_DIR="/var/www/vibevps"
BACKUP_DIR="/var/www/vibevps-backups"
LOG_FILE="/var/log/vibevps-update.log"
LOCK_FILE="/tmp/vibevps-update.lock"
CHAIN_FILE="/tmp/update-chain.json"
VERSION_HISTORY="/var/www/vibevps/.version-history.json"
UPDATE_FILE="$1"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

# Run command with error logging
run_cmd() {
    local description="$1"
    shift
    local cmd="$@"
    local temp_log=$(mktemp)

    if eval "$cmd" < /dev/null > "$temp_log" 2>&1; then
        rm -f "$temp_log"
        return 0
    else
        local exit_code=$?
        log_error "$description failed (exit code: $exit_code)"
        log_error "Command output:"
        cat "$temp_log" | while read line; do
            echo "[$(date '+%Y-%m-%d %H:%M:%S')]   $line" >> "$LOG_FILE"
        done
        tail -20 "$temp_log" | while read line; do
            log_error "  $line"
        done
        rm -f "$temp_log"
        return $exit_code
    fi
}

# Verify lock to prevent multiple executions
if [ -f "$LOCK_FILE" ]; then
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        log_error "Update already in progress (PID: $OLD_PID)"
        exit 1
    else
        log "Removing stale lock file"
        rm -f "$LOCK_FILE"
    fi
fi
trap "rm -f $LOCK_FILE" EXIT
echo $$ > "$LOCK_FILE"

if [ -z "$UPDATE_FILE" ] || [ ! -f "$UPDATE_FILE" ]; then
    log_error "File not found: $UPDATE_FILE"
    exit 1
fi

log "=== Starting VIBEVps Update ==="

# Determine if we are in chain mode
CHAIN_MODE=false
CHAIN_FILES=()
CHAIN_VERSIONS=()

if [ -f "$CHAIN_FILE" ]; then
    CHAIN_LENGTH=$(python3 -c "import json; f=open('$CHAIN_FILE'); d=json.load(f); print(len(d['chain'])); f.close()" 2>/dev/null || echo "0")

    if [ "$CHAIN_LENGTH" -gt "1" ]; then
        CHAIN_MODE=true
        log "Sequential update chain detected: $CHAIN_LENGTH steps"

        # Read all files and versions from chain
        for i in $(seq 0 $(($CHAIN_LENGTH - 1))); do
            STEP_FILE=$(python3 -c "import json; f=open('$CHAIN_FILE'); d=json.load(f); print(d['chain'][$i]['filePath']); f.close()" 2>/dev/null)
            STEP_VERSION=$(python3 -c "import json; f=open('$CHAIN_FILE'); d=json.load(f); print(d['chain'][$i]['version']); f.close()" 2>/dev/null)
            CHAIN_FILES+=("$STEP_FILE")
            CHAIN_VERSIONS+=("$STEP_VERSION")
            log "  Step $(($i + 1)): version $STEP_VERSION -> $STEP_FILE"
        done
    else
        # Single step chain
        CHAIN_VERSIONS[0]=$(python3 -c "import json; f=open('$CHAIN_FILE'); d=json.load(f); print(d['chain'][0]['version']); f.close()" 2>/dev/null || echo "unknown")
        CHAIN_FILES[0]="$UPDATE_FILE"
        log "Single update: version ${CHAIN_VERSIONS[0]}"
    fi
else
    log "Single update (no chain file)"
    CHAIN_FILES[0]="$UPDATE_FILE"
    CHAIN_VERSIONS[0]=$(grep '"version"' "$INSTALL_DIR/package.json" | head -1 | sed 's/.*: "\(.*\)",/\1/' 2>/dev/null || echo "unknown")
fi

# Create backup ONCE before starting any updates
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="backup-$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

log "Creating backup in: $BACKUP_PATH"
mkdir -p "$BACKUP_PATH"
cp -r "$INSTALL_DIR/backend" "$BACKUP_PATH/" 2>/dev/null || true
cp -r "$INSTALL_DIR/frontend" "$BACKUP_PATH/" 2>/dev/null || true
cp "$INSTALL_DIR/package.json" "$BACKUP_PATH/" 2>/dev/null || true
cp "$INSTALL_DIR/.env" "$BACKUP_PATH/" 2>/dev/null || true
cp -r "$INSTALL_DIR/data" "$BACKUP_PATH/" 2>/dev/null || true
log "Backup completed"

cd "$INSTALL_DIR"

# Process each update step
TOTAL_STEPS=${#CHAIN_FILES[@]}

for step_idx in $(seq 0 $(($TOTAL_STEPS - 1))); do
    STEP_FILE="${CHAIN_FILES[$step_idx]}"
    STEP_VERSION="${CHAIN_VERSIONS[$step_idx]}"

    log "--- Processing step $(($step_idx + 1))/$TOTAL_STEPS: version $STEP_VERSION ---"

    if [ ! -f "$STEP_FILE" ]; then
        log_error "Update file not found for step $(($step_idx + 1)): $STEP_FILE"
        exit 1
    fi

    log "Extracting $STEP_FILE..."
    EXTRACT_TEMP=$(mktemp -d)
    if ! run_cmd "File extraction" "unzip -o '$STEP_FILE' -d '$EXTRACT_TEMP'"; then
        log_error "Failed to extract update file for version $STEP_VERSION"
        rm -rf "$EXTRACT_TEMP"
        exit 1
    fi

    # Find the extracted root directory (e.g. vibevps/)
    EXTRACTED_DIR=$(find "$EXTRACT_TEMP" -mindepth 1 -maxdepth 1 -type d | head -1)
    if [ -z "$EXTRACTED_DIR" ]; then
        EXTRACTED_DIR="$EXTRACT_TEMP"
    fi

    # Copy files to install dir, excluding .env, node_modules, data
    rsync -a --exclude='.env' --exclude='node_modules' --exclude='data' "$EXTRACTED_DIR/" "$INSTALL_DIR/"
    rm -rf "$EXTRACT_TEMP"
    log "Files extracted for version $STEP_VERSION"

    # Fix permissions after extraction
    chown -R www-data:www-data "$INSTALL_DIR" 2>/dev/null || true

    # Clean up the zip file
    rm -f "$STEP_FILE"

    # Update version history for this step
    if [ -n "$STEP_VERSION" ] && [ "$STEP_VERSION" != "unknown" ]; then
        log "Recording version $STEP_VERSION in history"
        python3 << EOFPYTHON
import json
from datetime import datetime, timezone

try:
    with open('$VERSION_HISTORY', 'r') as f:
        history = json.load(f)
except:
    history = {'current_version': '$STEP_VERSION', 'applied_updates': []}

already_applied = any(u['version'] == '$STEP_VERSION' for u in history.get('applied_updates', []))

if not already_applied:
    history['applied_updates'].append({
        'version': '$STEP_VERSION',
        'applied_at': datetime.now(timezone.utc).isoformat()
    })
    history['current_version'] = '$STEP_VERSION'

    with open('$VERSION_HISTORY', 'w') as f:
        json.dump(history, f, indent=2)
    print('Version history updated for ' + '$STEP_VERSION')
else:
    print('Version already recorded (idempotent skip)')
EOFPYTHON
    fi

    log "Step $(($step_idx + 1))/$TOTAL_STEPS completed"
done

log "All update files extracted. Running build process..."

# Force non-interactive mode
export CI=true
export npm_config_yes=true

# Clean node_modules and build cache
log "Cleaning node_modules and build cache..."
rm -rf "$INSTALL_DIR/node_modules" 2>/dev/null || true
rm -rf "$INSTALL_DIR/backend/node_modules" 2>/dev/null || true
rm -rf "$INSTALL_DIR/frontend/node_modules" 2>/dev/null || true
rm -rf "$INSTALL_DIR/backend/dist" 2>/dev/null || true
rm -rf "$INSTALL_DIR/frontend/dist" 2>/dev/null || true
log "Cache cleaned"

log "Installing dependencies (clean install)..."
if ! run_cmd "npm install" "npm install"; then
    log_error "Failed to install dependencies"
    exit 1
fi
log "Dependencies installed"

# Fix permissions after npm install
log "Fixing permissions after npm install..."
chown -R www-data:www-data "$INSTALL_DIR" 2>/dev/null || true

log "Building application..."
if ! run_cmd "npm run build" "npm run build"; then
    log_error "Build failed - check errors above"
    log_error "You may need to run manually: cd $INSTALL_DIR && npm install && npm run build"
    exit 1
fi
log "Build completed"

# Clean up chain file
rm -f "$CHAIN_FILE"

log "Restarting application..."
if ! pm2 restart vibevps > /dev/null 2>&1; then
    log_error "Failed to restart application with pm2"
    log "Trying alternative restart..."
    pm2 stop vibevps 2>/dev/null || true
    if [ -f "$INSTALL_DIR/ecosystem.config.cjs" ]; then
        pm2 start "$INSTALL_DIR/ecosystem.config.cjs" 2>/dev/null || true
    else
        pm2 start "$INSTALL_DIR/backend/dist/server.js" --name "vibevps" --cwd "$INSTALL_DIR" --node-args="--env-file=$INSTALL_DIR/.env" 2>/dev/null || true
    fi
fi
log "Application restarted"

cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -rf

log "=== Update Completed Successfully ==="
exit 0
