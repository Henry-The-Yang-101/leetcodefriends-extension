#!/usr/bin/env bash

version="$(node -p "require('./manifest.json').version")"
echo "Version found: ${version}"
zip -rFS "versions/leetcodefriends-v${version}.zip" manifest.json background.js content.js match.js popup_content.html socket.io.min.js submission_interceptor.js username_obtainer.js icons
echo "Succesfully created package versions/leetcodefriends-v${version}.zip"
