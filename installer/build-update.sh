#!/bin/bash
# =============================================================================
# VIBEVps - Build Update Package
# Generates zip + updates manifest.json in installer/updates/
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
UPDATES_DIR="$SCRIPT_DIR/updates"

# Read version from root package.json
VERSION=$(node -e "console.log(require('$PROJECT_DIR/package.json').version)")

if [ -z "$VERSION" ]; then
  echo "ERROR: Could not read version from package.json"
  exit 1
fi

VERSION_DIR="$UPDATES_DIR/$VERSION"
ZIP_PATH="$VERSION_DIR/vibevps.zip"
MANIFEST_PATH="$UPDATES_DIR/manifest.json"
TEMP_DIR=$(mktemp -d)
STAGING_DIR="$TEMP_DIR/vibevps"

echo "=========================================="
echo " VIBEVps Update Package Builder"
echo "=========================================="
echo ""
echo " Version:  $VERSION"
echo " Output:   $VERSION_DIR/vibevps.zip"
echo ""

# Check if version already exists
if [ -f "$ZIP_PATH" ]; then
  read -p " Version $VERSION already exists. Overwrite? [y/N] " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Aborted."
    exit 0
  fi
fi

# Create directories
mkdir -p "$VERSION_DIR"
mkdir -p "$STAGING_DIR"

echo "[1/6] Copying root files..."
cp "$PROJECT_DIR/package.json" "$STAGING_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$STAGING_DIR/" 2>/dev/null || true

echo "[2/6] Copying backend sources..."
mkdir -p "$STAGING_DIR/backend"
cp "$PROJECT_DIR/backend/package.json" "$STAGING_DIR/backend/"
cp "$PROJECT_DIR/backend/tsconfig.json" "$STAGING_DIR/backend/"
cp -r "$PROJECT_DIR/backend/src" "$STAGING_DIR/backend/src"

echo "[3/6] Copying frontend sources..."
mkdir -p "$STAGING_DIR/frontend"
cp "$PROJECT_DIR/frontend/package.json" "$STAGING_DIR/frontend/"
cp "$PROJECT_DIR/frontend/tsconfig.json" "$STAGING_DIR/frontend/" 2>/dev/null || true
cp "$PROJECT_DIR/frontend/tsconfig.app.json" "$STAGING_DIR/frontend/" 2>/dev/null || true
cp "$PROJECT_DIR/frontend/tsconfig.node.json" "$STAGING_DIR/frontend/" 2>/dev/null || true
cp "$PROJECT_DIR/frontend/vite.config.ts" "$STAGING_DIR/frontend/"
cp "$PROJECT_DIR/frontend/index.html" "$STAGING_DIR/frontend/"
cp "$PROJECT_DIR/frontend/eslint.config.js" "$STAGING_DIR/frontend/" 2>/dev/null || true
cp "$PROJECT_DIR/frontend/.gitignore" "$STAGING_DIR/frontend/" 2>/dev/null || true
cp -r "$PROJECT_DIR/frontend/src" "$STAGING_DIR/frontend/src"
cp -r "$PROJECT_DIR/frontend/public" "$STAGING_DIR/frontend/public" 2>/dev/null || true

echo "[4/6] Copying scripts..."
mkdir -p "$STAGING_DIR/scripts"
cp "$PROJECT_DIR/installer/vibevps-installer-v1.0.0/scripts/update.sh" "$STAGING_DIR/scripts/" 2>/dev/null || true
if [ -d "$PROJECT_DIR/scripts" ]; then
  cp -r "$PROJECT_DIR/scripts/"* "$STAGING_DIR/scripts/" 2>/dev/null || true
fi

echo "[5/6] Creating zip..."
cd "$TEMP_DIR"
zip -rq "$ZIP_PATH" vibevps/ -x "*.DS_Store" "*__MACOSX*"

# Cleanup temp
rm -rf "$TEMP_DIR"

FILE_SIZE=$(stat -f%z "$ZIP_PATH" 2>/dev/null || stat -c%s "$ZIP_PATH" 2>/dev/null)
FILE_SIZE_KB=$((FILE_SIZE / 1024))
RELEASE_DATE=$(date +%Y-%m-%d)

echo "[6/6] Updating manifest..."

# Read changelog from argument or prompt
CHANGELOG="${1:-}"
if [ -z "$CHANGELOG" ]; then
  echo ""
  echo " Enter changelog (one line, changes separated by comma):"
  read -r CHANGELOG
fi

# Update manifest.json using node
node -e "
const fs = require('fs');
const path = '$MANIFEST_PATH';
let manifest = { product_name: 'VIBEVps', current_version: '0.0.0', versions: [] };
try { manifest = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}

// Remove existing version if overwriting
manifest.versions = manifest.versions.filter(v => v.version !== '$VERSION');

manifest.versions.unshift({
  version: '$VERSION',
  release_date: '$RELEASE_DATE',
  download_url: '/api/updates/download/VIBEVps/$VERSION/vibevps.zip',
  filename: 'vibevps.zip',
  changelog: $(node -e "console.log(JSON.stringify('$CHANGELOG'.replace(/'/g, \"\\\\'\")))" 2>/dev/null || echo '""'),
  file_size: $FILE_SIZE
});

// Sort descending
manifest.versions.sort((a, b) => {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pb[i]||0) !== (pa[i]||0)) return (pb[i]||0) - (pa[i]||0);
  }
  return 0;
});

manifest.current_version = manifest.versions[0].version;
fs.writeFileSync(path, JSON.stringify(manifest, null, 2));
console.log('Manifest updated: ' + manifest.current_version + ' (' + manifest.versions.length + ' versions)');
"

echo ""
echo "=========================================="
echo " Done!"
echo "=========================================="
echo " Zip:      $VERSION_DIR/vibevps.zip (${FILE_SIZE_KB} KB)"
echo " Manifest: $MANIFEST_PATH"
echo ""
echo " Upload both to VIBEVault admin panel:"
echo "   Product: VIBEVps"
echo "   Version: $VERSION"
echo "=========================================="
