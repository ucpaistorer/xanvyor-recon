#!/bin/bash
set -e

echo "🔨 Building XANVYOR RECON for production deployment..."

# Build the Next.js project
echo "📦 Running next build..."
bun run build 2>&1

echo "✅ Build complete!"
echo ""
echo "Deployment files are in .next/standalone/"
echo ""
echo "To deploy to your VPS:"
echo "1. Upload the entire project directory to your VPS"
echo "2. Run: bun install --production"
echo "3. Run: bun .next/standalone/server.js"
echo ""
echo "Or use the deploy script with SSH access"
