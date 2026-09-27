#!/usr/bin/env bash
set -euo pipefail

version="$(node -p "require('./manifest.json').version")"
echo "Version found: ${version}"
mkdir -p versions
zip -rFS "versions/leetcodefriends-v${version}.zip" manifest.json background.js content.js match.js popup_content.html socket.io.min.js submission_interceptor.js username_obtainer.js autocomplete-config.js autocomplete.js icons vendor
echo "Successfully created package versions/leetcodefriends-v${version}.zip"
