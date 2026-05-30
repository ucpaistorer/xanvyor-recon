import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Admin deployment endpoint - triggers git pull + rebuild + restart
export async function POST(request: NextRequest) {
  try {
    const { apiKey, action } = await request.json();
    
    // Verify admin API key
    const validAdminKeys = [
      'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e',
      'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
    ];
    
    if (!apiKey || !validAdminKeys.includes(apiKey)) {
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
