import { Client } from 'ssh2';
import { createReadStream, statSync, readdirSync } from 'fs';
import { join } from 'path';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/home/xanvyor-recon';

const conn = new Client();

function exec(cmd: string, timeout: number = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { timeout }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      stream.on('close', () => {
        resolve(stdout + (stderr ? '\n' + stderr : ''));
      });
    });
  });
}

function uploadFile(local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const size = statSync(local).size;
    console.log(`[SFTP] Uploading ${(size/1024/1024).toFixed(1)}MB: ${local} -> ${remote}`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const rs = createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      let uploaded = 0;
      rs.on('data', (chunk: Buffer) => {
        uploaded += chunk.length;
        if (uploaded % (2 * 1024 * 1024) < chunk.length) {
          console.log(`  ${(uploaded/size*100).toFixed(0)}%...`);
        }
      });
      ws.on('close', () => { console.log(`  Done!`); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });
  });
}

function uploadBuffer(buffer: Buffer, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remote);
      ws.on('close', () => resolve());
      ws.on('error', reject);
      ws.end(buffer);
    });
  });
}

async function main() {
  console.log('=== XANVYOR RECON - VPS Deploy ===\n');

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('[SSH] Connected!'); resolve(); });
    conn.on('error', reject);
    conn.connect({
      host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS,
      readyTimeout: 30000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
        hostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
      }
    });
  });

  try {
    // Step 1: Stop existing services
    console.log('\n[1] Stopping old services...');
    await exec('systemctl stop xanvyor-recon 2>/dev/null; pm2 stop xanvyor-recon 2>/dev/null; pm2 delete xanvyor-recon 2>/dev/null; echo "Stopped"');

    // Step 2: Clean and prepare directory
    console.log('\n[2] Preparing directory...');
    await exec(`mkdir -p ${REMOTE_DIR} && rm -rf ${REMOTE_DIR}/.next && echo "Cleaned"`);

    // Step 3: Upload the deployment package
    console.log('\n[3] Uploading deployment package...');
    await uploadFile('/tmp/xanvyor-deploy.tar.gz', `${REMOTE_DIR}/deploy.tar.gz`);

    // Step 4: Extract
    console.log('\n[4] Extracting...');
    await exec(`cd ${REMOTE_DIR} && tar xzf deploy.tar.gz && rm -f deploy.tar.gz && echo "Extracted"`);

    // Step 5: Copy static files to standalone
    console.log('\n[5] Setting up standalone...');
    await exec(`
cd ${REMOTE_DIR}
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
cp -r prisma .next/standalone/prisma 2>/dev/null || true
mkdir -p .next/standalone/db
cp db/custom.db .next/standalone/db/custom.db 2>/dev/null || true
echo "Standalone setup done"
    `);

    // Step 6: Install production dependencies
    console.log('\n[6] Installing production deps...');
    await exec(`cd ${REMOTE_DIR}/.next/standalone && npm install --production prisma @prisma-client better-sqlite3 2>&1 | tail -5`, 180000);

    // Step 7: Generate Prisma client
    console.log('\n[7] Generating Prisma client...');
    await exec(`cd ${REMOTE_DIR}/.next/standalone && npx prisma generate 2>&1`, 60000);

    // Step 8: Create .env file
    console.log('\n[8] Creating env file...');
    const envContent = `DATABASE_URL=file:${REMOTE_DIR}/.next/standalone/db/custom.db\nNODE_ENV=production\nPORT=3002\nHOSTNAME=0.0.0.0\n`;
    await uploadBuffer(Buffer.from(envContent), `${REMOTE_DIR}/.next/standalone/.env`);

    // Step 9: Update systemd service
    console.log('\n[9] Updating systemd service...');
    await exec(`cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/.next/standalone/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
echo "Service updated"`);

    // Step 10: Update nginx config to fix port
    console.log('\n[10] Verifying nginx config...');
    const nginxTest = await exec('nginx -t 2>&1');
    console.log(nginxTest);

    // Step 11: Seed admin key
    console.log('\n[11] Seeding admin API key...');
    // The admin key will be seeded using the existing API after the app starts

    // Step 12: Start service
    console.log('\n[12] Starting service...');
    await exec('systemctl start xanvyor-recon');
    await new Promise(r => setTimeout(r, 5000));

    // Step 13: Verify
    console.log('\n[13] Verifying...');
    const status = await exec('systemctl status xanvyor-recon --no-pager | head -15');
    console.log(status);

    const httpCheck = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ 2>&1');
    console.log(`HTTP Status: ${httpCheck.trim()}`);

    // Step 14: Setup SSL with certbot
    console.log('\n[14] Setting up SSL...');
    // First check if certbot can reach the domain
    const dnsResult = await exec('dig +short xanvyorrecon.id 2>/dev/null || echo "NO_DNS"');
    console.log(`DNS: xanvyorrecon.id -> ${dnsResult.trim()}`);

    if (dnsResult.includes('76.13.198.125') || dnsResult.includes('2.57.91.91')) {
      // Try certbot
      const sslResult = await exec(`certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>&1 | tail -20`, 60000);
      console.log(sslResult);
    } else {
      console.log('DNS not pointing to this VPS yet. SSL will be set up after DNS update.');
      // Ensure nginx still works with self-signed cert
    }

    // Restart nginx
    await exec('systemctl restart nginx');

    // Final check
    console.log('\n=== DEPLOYMENT RESULT ===');
    const finalHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/');
    console.log(`Local HTTP: ${finalHttp.trim()}`);
    const finalHttps = await exec('curl -sk -o /dev/null -w "%{http_code}" https://xanvyorrecon.id/ 2>&1 || echo "FAILED"');
    console.log(`HTTPS: ${finalHttps.trim()}`);

    console.log('\nDone!');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
