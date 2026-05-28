import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const DOMAIN = 'xanvyorrecon.id';
const REMOTE_DIR = '/opt/xanvyor-recon';
const DEPLOY_PKG = '/tmp/xanvyor-deploy.tar.gz';

const conn = new Client();

function exec(cmd: string, timeout: number = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[SSH] Executing: ${cmd.substring(0, 120)}...`);
    conn.exec(cmd, { timeout }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      stream.on('close', () => {
        if (stderr && !stderr.includes('WARNING')) {
          console.log(`[SSH] stderr: ${stderr.substring(0, 500)}`);
        }
        resolve(stdout);
      });
    });
  });
}

function uploadFile(local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[SFTP] Uploading ${local} -> ${remote}`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const rs = createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      const fileSize = statSync(local).size;
      let uploaded = 0;
      rs.on('data', (chunk: Buffer) => {
        uploaded += chunk.length;
        const pct = ((uploaded / fileSize) * 100).toFixed(1);
        if (uploaded % (5 * 1024 * 1024) < chunk.length) {
          console.log(`[SFTP] Progress: ${pct}% (${(uploaded / 1024 / 1024).toFixed(1)}MB / ${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
        }
      });
      ws.on('close', () => {
        console.log(`[SFTP] Upload complete: ${remote}`);
        resolve();
      });
      ws.on('error', reject);
      rs.pipe(ws);
    });
  });
}

async function deploy() {
  console.log('='.repeat(60));
  console.log('XANVYOR RECON - VPS Deployment');
  console.log('='.repeat(60));

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => {
      console.log('[SSH] Connected to VPS!');
      resolve();
    });
    conn.on('error', (err) => {
      console.error('[SSH] Connection error:', err.message);
      reject(err);
    });
    conn.connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 30000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
        hostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
      }
    });
  });

  try {
    // Step 1: Check VPS environment
    console.log('\n[Step 1] Checking VPS environment...');
    const osInfo = await exec('cat /etc/os-release | head -5');
    console.log(`OS: ${osInfo.substring(0, 200)}`);

    const arch = await exec('uname -m');
    console.log(`Architecture: ${arch.trim()}`);

    const diskSpace = await exec('df -h / | tail -1');
    console.log(`Disk: ${diskSpace.trim()}`);

    const memInfo = await exec('free -h | head -2');
    console.log(`Memory:\n${memInfo.substring(0, 200)}`);

    // Step 2: Install Node.js if needed
    console.log('\n[Step 2] Setting up Node.js...');
    const nodeCheck = await exec('which node && node -v || echo "NOT_FOUND"');
    if (nodeCheck.includes('NOT_FOUND')) {
      console.log('Installing Node.js 20...');
      await exec('curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs', 120000);
    } else {
      console.log(`Node.js already installed: ${nodeCheck.trim()}`);
    }

    // Step 3: Install bun if needed
    console.log('\n[Step 3] Setting up Bun...');
    const bunCheck = await exec('which bun && bun -v || echo "NOT_FOUND"');
    if (bunCheck.includes('NOT_FOUND')) {
      console.log('Installing Bun...');
      await exec('curl -fsSL https://bun.sh/install | bash', 60000);
      await exec('export PATH="$HOME/.bun/bin:$PATH" && echo "PATH set"');
    } else {
      console.log(`Bun already installed: ${bunCheck.trim()}`);
    }

    // Step 4: Create app directory and upload
    console.log('\n[Step 4] Uploading deployment package...');
    await exec(`mkdir -p ${REMOTE_DIR}`);
    await uploadFile(DEPLOY_PKG, `${REMOTE_DIR}/deploy.tar.gz`);
    console.log('Upload complete!');

    // Step 5: Extract and setup
    console.log('\n[Step 5] Extracting and setting up...');
    await exec(`
cd ${REMOTE_DIR} && \
tar xzf deploy.tar.gz && \
rm -f deploy.tar.gz && \
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true && \
cp -r public .next/standalone/public 2>/dev/null || true && \
cp -r prisma .next/standalone/prisma 2>/dev/null || true && \
mkdir -p .next/standalone/db && \
cp db/custom.db .next/standalone/db/custom.db 2>/dev/null || true && \
echo "Extraction complete"
    `, 60000);

    // Step 6: Install production dependencies in standalone
    console.log('\n[Step 6] Installing production dependencies...');
    await exec(`cd ${REMOTE_DIR}/.next/standalone && npm install --production prisma @prisma/client better-sqlite3 2>&1 || true`, 120000);
    await exec(`cd ${REMOTE_DIR}/.next/standalone && npx prisma generate 2>&1 || true`, 60000);

    // Step 7: Setup environment
    console.log('\n[Step 7] Configuring environment...');
    await exec(`cat > ${REMOTE_DIR}/.next/standalone/.env << 'ENVEOF'
DATABASE_URL=file:${REMOTE_DIR}/.next/standalone/db/custom.db
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
ENVEOF
echo "Environment configured"`);

    // Step 8: Create systemd service
    console.log('\n[Step 8] Creating systemd service...');
    await exec(`cat > /etc/systemd/system/xanvyor-recon.service << 'SVCEOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}/.next/standalone
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/.next/standalone/db/custom.db

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
echo "Service configured"`);

    // Step 9: Setup Nginx reverse proxy
    console.log('\n[Step 9] Setting up Nginx...');
    const nginxCheck = await exec('which nginx || echo "NOT_FOUND"');
    if (nginxCheck.includes('NOT_FOUND')) {
      console.log('Installing Nginx...');
      await exec('apt-get update && apt-get install -y nginx certbot python3-certbot-nginx', 120000);
    }

    await exec(`cat > /etc/nginx/sites-available/${DOMAIN} << 'NGXEOF'
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGXEOF
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/ 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 && echo "Nginx config OK" || echo "Nginx config ERROR"`);

    // Step 10: Start the app
    console.log('\n[Step 10] Starting the application...');
    await exec('systemctl enable xanvyor-recon && systemctl restart xanvyor-recon', 15000);
    await exec('systemctl restart nginx', 10000);

    // Wait a moment and check status
    console.log('\n[Step 11] Verifying deployment...');
    await new Promise(r => setTimeout(r, 5000));
    const serviceStatus = await exec('systemctl status xanvyor-recon --no-pager | head -15');
    console.log(`Service status:\n${serviceStatus}`);

    const nginxStatus = await exec('systemctl status nginx --no-pager | head -10');
    console.log(`Nginx status:\n${nginxStatus}`);

    const portCheck = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "FAILED"');
    console.log(`Local HTTP check: ${portCheck.trim()}`);

    // Step 12: Setup SSL with certbot
    console.log('\n[Step 12] Setting up SSL...');
    const sslResult = await exec(`certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} 2>&1 || echo "SSL_SETUP_FAILED"`, 60000);
    console.log(`SSL setup: ${sslResult.substring(0, 500)}`);

    // Final verification
    console.log('\n[Step 13] Final verification...');
    const finalCheck = await exec(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "FAILED"`);
    console.log(`Final HTTP check: ${finalCheck.trim()}`);

    console.log('\n' + '='.repeat(60));
    console.log('DEPLOYMENT COMPLETE!');
    console.log(`Website: https://${DOMAIN}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('[DEPLOY ERROR]', error);
  } finally {
    conn.end();
  }
}

deploy().catch(console.error);
