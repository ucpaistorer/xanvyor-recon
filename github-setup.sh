#!/bin/bash
# =============================================================
# GitHub Repository Setup for XANVYOR RECON
# =============================================================
# This script pushes the XANVYOR RECON project to GitHub
# 
# PREREQUISITE: You need a GitHub Personal Access Token
# 1. Go to https://github.com/settings/tokens
# 2. Click "Generate new token (classic)"
# 3. Select scopes: repo (full control)
# 4. Generate and copy the token
# 
# USAGE:
#   export GITHUB_TOKEN=ghp_your_token_here
#   export GITHUB_USERNAME=your_github_username
#   bash github-setup.sh
# =============================================================

set -e

TOKEN="${GITHUB_TOKEN}"
USERNAME="${GITHUB_USERNAME}"
REPO_NAME="xanvyor-recon"

if [ -z "$TOKEN" ] || [ -z "$USERNAME" ]; then
  echo "❌ Error: GITHUB_TOKEN and GITHUB_USERNAME must be set"
  echo ""
  echo "Run:"
  echo "  export GITHUB_TOKEN=ghp_your_token_here"
  echo "  export GITHUB_USERNAME=your_github_username"
  echo "  bash github-setup.sh"
  exit 1
fi

echo "🚀 Setting up GitHub repository: $USERNAME/$REPO_NAME"

# Create repository via GitHub API
echo "[1/4] Creating GitHub repository..."
curl -s -X POST https://api.github.com/user/repos \
  -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"XANVYOR RECON - Advanced AI-Powered OSINT Intelligence Platform\",\"private\":false,\"auto_init\":false}" 2>&1 | head -5

# Download project files
echo "[2/4] Downloading project files..."
mkdir -p /tmp/xanvyor-recon
cd /tmp/xanvyor-recon
curl -sL "https://litter.catbox.moe/2o10ba.gz" -o project.tar.gz
tar xzf project.tar.gz
rm -f project.tar.gz

# Initialize git and push
echo "[3/4] Initializing git repository..."
git init
git add -A
git commit -m "XANVYOR RECON - Complete OSINT Intelligence Platform"

echo "[4/4] Pushing to GitHub..."
git remote add origin "https://$TOKEN@github.com/$USERNAME/$REPO_NAME.git"
git branch -M main
git push -u origin main

echo ""
echo "✅ GitHub repository created!"
echo "🔗 https://github.com/$USERNAME/$REPO_NAME"
