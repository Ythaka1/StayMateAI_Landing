#!/bin/sh
# Local verification helper: rebuild and restart the production server on :3000.
# Not part of the app. Remove before merge if it is still here.
set -e
cd "$(dirname "$0")"
npm run build 2>&1 | tail -4
pkill -f next-server || true
sleep 4
(setsid npx next start >/tmp/staymate-next.log 2>&1 &)
sleep 9
printf 'server: '
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
