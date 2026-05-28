#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 node .next/standalone/server.js
  echo "[$(date)] Server died, restarting in 2s..." >> /home/z/my-project/server-restart.log
  sleep 2
done
