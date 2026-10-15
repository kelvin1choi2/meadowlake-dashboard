#!/bin/sh
# Keeps the dashboard on the Synology up to date with the newest GitHub release.
# Run it from DSM → Control Panel → Task Scheduler (see docs/nas.md). Safe to run
# often: it only downloads when GitHub has a newer build than the one installed.
set -eu

DEST="${1:-/volume1/web/meadowlake}"
BASE="https://github.com/kelvin1choi2/meadowlake-dashboard/releases/latest/download"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "$BASE/meadowlake.tar.gz" -o "$TMP/meadowlake.tar.gz"
mkdir "$TMP/new"
tar -xzf "$TMP/meadowlake.tar.gz" -C "$TMP/new"

NEW="$(cat "$TMP/new/version.txt" 2>/dev/null || echo unknown)"
OLD="$(cat "$DEST/version.txt" 2>/dev/null || echo none)"
if [ "$NEW" = "$OLD" ]; then
  echo "Dashboard already at $OLD."
  exit 0
fi

mkdir -p "$DEST"
# Replace the old files, keeping the folder itself so Web Station's settings stay put.
find "$DEST" -mindepth 1 -delete
cp -R "$TMP/new/." "$DEST/"
echo "Dashboard updated: $OLD -> $NEW"
