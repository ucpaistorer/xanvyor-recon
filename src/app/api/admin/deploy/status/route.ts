import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout: log } = await execAsync('tail -100 /tmp/deploy.log 2>/dev/null || echo "No deployment log found"');
    const { stdout: service } = await execAsync('systemctl is-active xanvyor-recon 2>/dev/null || echo "unknown"');
    const { stdout: nginx } = await execAsync('systemctl is-active nginx 2>/dev/null || echo "unknown"');
    const { stdout: ssl } = await execAsync('certbot certificates 2>/dev/null | head -5 || echo "No SSL certificates"');
    const { stdout: uptime } = await execAsync('uptime 2>/dev/null || echo "unknown"');
    
    return NextResponse.json({
      service: service.trim(),
      nginx: nginx.trim(),
      ssl: ssl.trim(),
      uptime: uptime.trim(),
      deployLog: log,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
