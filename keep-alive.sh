#!/bin/bash
cd /home/z/my-project
while true; do
    # Check if Next.js is already running
    if ! pgrep -f "next-server" > /dev/null 2>&1; then
        echo "$(date): Starting Next.js dev server..." >> /home/z/my-project/keep-alive.log
        bun --bun run dev >> /home/z/my-project/dev.log 2>&1 &
        sleep 5
    fi
    sleep 10
done
