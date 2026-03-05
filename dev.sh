#!/bin/sh
# Use this instead of `npm run dev` when VS Code terminals inherit a broken cwd.
# Starting from / gives Node.js a valid cwd; the project path is passed explicitly.
PROJ="/Users/ankitmehra/Documents/health_frontend"
cd / && node \
  --require "$PROJ/patch-localstorage.js" \
  "$PROJ/node_modules/.bin/next" \
  dev "$PROJ"
