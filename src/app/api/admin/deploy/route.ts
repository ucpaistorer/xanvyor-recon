import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const VALID_ADMIN_KEYS = [
  'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e',
  'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
];

// GitHub webhook secret for verification
const GITHUB_WEBHOOK_SECRET = 'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e';

function verifyGithubSignature(payload: string, signature: string): boolean {
  const crypto = require('crypto');
  const expected = 'sha256=' + crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return expected === signature;
}

// Admin deployment endpoint - triggers git pull + rebuild + restart
// Supports both JSON body and query parameters
// Also handles GitHub webhook events
export async function POST(request: NextRequest) {
  try {
    // Check for GitHub webhook signature
    const githubSignature = request.headers.get('x-hub-signature-256');
    const githubEvent = request.headers.get('x-github-event');
    
    // If this is a GitHub webhook, verify signature and trigger deployment
    if (githubSignature && githubEvent) {
      const rawBody = await request.text();
      const isValid = verifyGithubSignature(rawBody, githubSignature);
      
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
      }
      
      // GitHub push event - trigger fix-all deployment
      if (githubEvent === 'push' || githubEvent === 'ping') {
        const command = 'curl -sL https://raw.githubusercontent.com/ucpaistorer/xanvyor-recon/main/scripts/fix-all.sh -o /tmp/fix-all.sh && chmod +x /tmp/fix-all.sh && nohup bash /tmp/fix-all.sh > /tmp/deploy.log 2>&1 &';
        execAsync(command, { timeout: 10000 }).catch(() => {});
        
        return NextResponse.json({ 
          success: true, 
          message: `GitHub ${githubEvent} event received. Deployment started.`,
          action: 'fix-all'
        });
      }
      
      return NextResponse.json({ success: true, message: `GitHub ${githubEvent} event received. No action taken.` });
    }
    
    // Standard API request - check query params first, then body
    const url = new URL(request.url);
    let apiKey = url.searchParams.get('apiKey');
    let action = url.searchParams.get('action');
    
    // If not in query params, try body
    if (!apiKey || !action) {
      try {
        const body = await request.json();
        apiKey = apiKey || body.apiKey;
        action = action || body.action;
      } catch {
        // No JSON body, use query params only
      }
    }
    
    // Verify admin API key
    if (!apiKey || !VALID_ADMIN_KEYS.includes(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized - admin key required' }, { status: 401 });
    }

    if (action === 'deploy' || action === 'fix-all') {
      // Run the fix-all deployment script in the background
      const command = action === 'fix-all'
        ? 'curl -sL https://raw.githubusercontent.com/ucpaistorer/xanvyor-recon/main/scripts/fix-all.sh -o /tmp/fix-all.sh && chmod +x /tmp/fix-all.sh && nohup bash /tmp/fix-all.sh > /tmp/deploy.log 2>&1 &'
        : 'cd /opt/xanvyor-recon && git pull origin main && npm install && npx prisma generate && npx prisma db push --skip-generate && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && systemctl restart xanvyor-recon';

      execAsync(command, { timeout: 10000 }).catch(() => {});
      
      return NextResponse.json({ 
        success: true, 
        message: `Deployment '${action}' started in background. Check /api/admin/deploy/status for progress.`,
        action 
      });
    }

    if (action === 'status') {
      try {
        const { stdout } = await execAsync('tail -50 /tmp/deploy.log 2>/dev/null || echo "No deployment log found"');
        const { stdout: serviceStatus } = await execAsync('systemctl is-active xanvyor-recon 2>/dev/null || echo "unknown"');
        return NextResponse.json({ 
          success: true, 
          deployLog: stdout,
          serviceStatus: serviceStatus.trim(),
        });
      } catch {
        return NextResponse.json({ success: true, deployLog: 'No log available', serviceStatus: 'unknown' });
      }
    }

    if (action === 'restart') {
      await execAsync('systemctl restart xanvyor-recon', { timeout: 10000 });
      return NextResponse.json({ success: true, message: 'Service restarted' });
    }

    if (action === 'ssl') {
      const domain = 'xanvyorrecon.id';
      const { stdout, stderr } = await execAsync(
        `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email admin@${domain} --redirect 2>&1 || echo "SSL setup failed"`,
        { timeout: 60000 }
      );
      return NextResponse.json({ success: true, output: stdout + stderr });
    }

    return NextResponse.json({ error: 'Unknown action. Use: deploy, fix-all, status, restart, ssl' }, { status: 400 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also handle GET requests for easy triggering
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('apiKey');
    const action = url.searchParams.get('action') || 'fix-all';
    
    // Verify admin API key
    if (!apiKey || !VALID_ADMIN_KEYS.includes(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized - admin key required' }, { status: 401 });
    }

    if (action === 'deploy' || action === 'fix-all') {
      const command = action === 'fix-all'
        ? 'curl -sL https://raw.githubusercontent.com/ucpaistorer/xanvyor-recon/main/scripts/fix-all.sh -o /tmp/fix-all.sh && chmod +x /tmp/fix-all.sh && nohup bash /tmp/fix-all.sh > /tmp/deploy.log 2>&1 &'
        : 'cd /opt/xanvyor-recon && git pull origin main && npm install && npx prisma generate && npx prisma db push --skip-generate && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && systemctl restart xanvyor-recon';

      execAsync(command, { timeout: 10000 }).catch(() => {});
      
      return NextResponse.json({ 
        success: true, 
        message: `Deployment '${action}' started in background.`,
        action 
      });
    }

    if (action === 'status') {
      try {
        const { stdout } = await execAsync('tail -50 /tmp/deploy.log 2>/dev/null || echo "No deployment log found"');
        const { stdout: serviceStatus } = await execAsync('systemctl is-active xanvyor-recon 2>/dev/null || echo "unknown"');
        return NextResponse.json({ 
          success: true, 
          deployLog: stdout,
          serviceStatus: serviceStatus.trim(),
        });
      } catch {
        return NextResponse.json({ success: true, deployLog: 'No log available', serviceStatus: 'unknown' });
      }
    }

    if (action === 'ssl') {
      const domain = 'xanvyorrecon.id';
      const { stdout, stderr } = await execAsync(
        `certbot --nginx -d ${domain} -d www.${domain} --non-interactive --agree-tos --email admin@${domain} --redirect 2>&1 || echo "SSL setup failed"`,
        { timeout: 60000 }
      );
      return NextResponse.json({ success: true, output: stdout + stderr });
    }

    return NextResponse.json({ error: 'Unknown action. Use: deploy, fix-all, status, ssl' }, { status: 400 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
