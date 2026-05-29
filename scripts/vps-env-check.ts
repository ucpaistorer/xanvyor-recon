import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { timeout }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      stream.on('close', () => { resolve(stdout + (stderr ? '\n' + stderr : '')); });
    });
  });
}

async function main() {
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
    // Check environment
    console.log('\n[1] Current .env file:');
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.env'));

    // Check if ZAI_API_KEY is needed
    console.log('\n[2] Checking z-ai-web-dev-sdk requirements...');
    console.log(await exec('grep -r "ZAI" /home/xanvyor-recon/.next/standalone/.next/server/ 2>/dev/null | head -5 || echo "Not found"'));
    console.log(await exec('grep -r "API_KEY" /home/xanvyor-recon/.next/standalone/.next/server/ 2>/dev/null | head -5 || echo "Not found"'));

    // Check the SDK module
    console.log('\n[3] Checking SDK module...');
    console.log(await exec('ls /home/xanvyor-recon/.next/standalone/node_modules/z-ai-web-dev-sdk/ 2>/dev/null | head -10'));
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/node_modules/z-ai-web-dev-sdk/README.md 2>/dev/null | head -30 || echo "No README"'));
    
    // Check SDK source for env vars
    console.log('\n[4] SDK env vars...');
    console.log(await exec('grep -r "process.env" /home/xanvyor-recon/.next/standalone/node_modules/z-ai-web-dev-sdk/dist/ 2>/dev/null | head -10 || echo "No dist"'));
    console.log(await exec('grep -r "process.env" /home/xanvyor-recon/.next/standalone/node_modules/z-ai-web-dev-sdk/src/ 2>/dev/null | head -10 || echo "No src"'));

    // Check node_modules structure
    console.log('\n[5] SDK package.json...');
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/node_modules/z-ai-web-dev-sdk/package.json 2>/dev/null | head -20 || echo "Not found"'));
    
    // Check the actual zai.ts file in the build
    console.log('\n[6] Checking build output for ZAI...');
    console.log(await exec('find /home/xanvyor-recon/.next/standalone/.next -name "*.js" -path "*zai*" 2>/dev/null | head -5'));
    console.log(await exec('find /home/xanvyor-recon/.next/standalone/.next -name "*.js" | xargs grep -l "z-ai-web-dev-sdk" 2>/dev/null | head -5'));

    // Check app logs for errors
    console.log('\n[7] App service logs...');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 30 2>&1'));

    // Check the SDK key env variable
    console.log('\n[8] Environment check...');
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.env'));
    console.log(await exec('printenv | grep -i zai 2>/dev/null || echo "No ZAI env vars"'));

    // The z-ai-web-dev-sdk likely needs ZAI_API_KEY or similar
    // Let's add it to the .env and restart
    console.log('\n[9] Adding API key to environment...');
    await exec(`cat >> /home/xanvyor-recon/.next/standalone/.env << 'EOF'
ZAI_API_KEY=8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a
EOF
cat /home/xanvyor-recon/.next/standalone/.env`);

    // Update systemd service with the env var
    console.log('\n[10] Updating systemd service...');
    await exec(`cat > /etc/systemd/system/xanvyor-recon.service << 'SVCEOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/xanvyor-recon/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:/home/xanvyor-recon/.next/standalone/db/custom.db
Environment=ZAI_API_KEY=8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl restart xanvyor-recon
echo "Service updated and restarted"`);

    await new Promise(r => setTimeout(r, 5000));
    
    // Verify
    console.log('\n[11] Verifying...');
    console.log(await exec('systemctl status xanvyor-recon --no-pager | head -10'));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
