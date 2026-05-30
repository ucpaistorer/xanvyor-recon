#!/bin/bash
cd /home/z/my-project
while true; do
  bun --bun run dev
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
