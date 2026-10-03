#!/usr/bin/env bash
# Startet God's Eye View auf macOS und Linux: ./start.sh
# Details und Optionen: scripts/launch.mjs
cd "$(dirname "$0")" || exit 1

# Aus dem Finder oder Dateimanager gestartet fehlen oft die Pfade von
# Homebrew und nvm.
if ! command -v node >/dev/null 2>&1; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  # shellcheck disable=SC1091
  [ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js wurde nicht gefunden."
  echo "Bitte Node.js 24 LTS von https://nodejs.org installieren und danach erneut starten."
  echo
  read -r -p "Enter zum Schließen ..." _
  exit 1
fi

node scripts/launch.mjs --lang de "$@"
status=$?
if [ "$status" -ne 0 ]; then
  read -r -p "Enter zum Schließen ..." _
fi
exit "$status"
