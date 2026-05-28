import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 60000): Promise<string> {
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
    // Step 1: Check all nginx configs
    console.log('\n[1] Current nginx configs:');
    console.log(await exec('ls -la /etc/nginx/conf.d/'));
    
    // Check nexvo config
    console.log('\n[2] Nexvo config:');
    console.log(await exec('cat /etc/nginx/conf.d/nexvo.conf | head -30'));

    // Step 2: Update xanvyorrecon.conf - make it the default server and also serve on IP
    console.log('\n[3] Updating xanvyorrecon nginx config...');
    await exec(`cat > /etc/nginx/conf.d/xanvyorrecon.conf << 'NGXEOF'
# HTTP server - also serve on IP directly
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name xanvyorrecon.id www.xanvyorrecon.id 76.13.198.125;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

# HTTPS server
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name xanvyorrecon.id www.xanvyorrecon.id 76.13.198.125;

    # SSL
    ssl_certificate /etc/ssl/xanvyor/cert.pem;
    ssl_certificate_key /etc/ssl/xanvyor/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 256;
}
NGXEOF
echo "Config written"`);

    // Remove the default server from nginx.conf if it conflicts
    console.log('\n[4] Checking nginx.conf default server...');
    const nginxConf = await exec('cat /etc/nginx/nginx.conf');
    if (nginxConf.includes('default_server')) {
      console.log('Need to remove default_server from nginx.conf');
      await exec(`sed -i 's/listen.*80.*default_server/listen       80/' /etc/nginx/nginx.conf`);
      await exec(`sed -i 's/listen.*\\[::\\]:80.*default_server/listen       [::]:80/' /etc/nginx/nginx.conf`);
    }

    // Also check nexvo.conf for default_server
    const nexvoConf = await exec('grep -n "default_server" /etc/nginx/conf.d/nexvo.conf 2>/dev/null || echo "No default_server in nexvo"');
    if (nexvoConf.includes('default_server')) {
      console.log('Removing default_server from nexvo.conf');
      await exec(`sed -i 's/ default_server//' /etc/nginx/conf.d/nexvo.conf`);
    }

    // Step 3: Test and restart nginx
    console.log('\n[5] Testing nginx...');
    const test = await exec('nginx -t 2>&1');
    console.log(test);

    if (test.includes('successful')) {
      console.log('Restarting nginx...');
      await exec('systemctl restart nginx 2>&1');
    }

    // Step 4: Verify with correct Host header
    console.log('\n[6] Verification tests...');
    
    // Test via IP HTTP
    const ipHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125/');
    console.log(`IP HTTP: ${ipHttp.trim()}`);
    
    // Test via IP HTTPS
    const ipHttps = await exec('curl -sk -o /dev/null -w "%{http_code}" https://76.13.198.125/');
    console.log(`IP HTTPS: ${ipHttps.trim()}`);

    // Test with Host header
    const hostHttp = await exec('curl -s -H "Host: xanvyorrecon.id" -o /dev/null -w "%{http_code}" http://localhost/');
    console.log(`Host header HTTP: ${hostHttp.trim()}`);

    const hostHttps = await exec('curl -sk -H "Host: xanvyorrecon.id" -o /dev/null -w "%{http_code}" https://localhost/');
    console.log(`Host header HTTPS: ${hostHttps.trim()}`);

    // Check page content
    const pageContent = await exec('curl -s -H "Host: xanvyorrecon.id" http://localhost/ | grep -o "<title>[^<]*</title>"');
    console.log(`Page title: ${pageContent.trim()}`);

    // Test from external (via IP)
    const extHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125:3002/');
    console.log(`Direct port 3002: ${extHttp.trim()}`);

    // Step 5: Check firewall
    console.log('\n[7] Firewall check...');
    console.log(await exec('firewall-cmd --list-ports 2>/dev/null || iptables -L -n | grep -E "(80|443|3002)" 2>/dev/null || echo "No firewall info"'));

    // Step 6: Open firewall if needed
    console.log('\n[8] Ensuring firewall allows traffic...');
    await exec(`
firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
firewall-cmd --permanent --add-port=3002/tcp 2>/dev/null || true
firewall-cmd --reload 2>/dev/null || true
echo "Firewall updated"
    `);

    console.log('\n=== FINAL STATUS ===');
    console.log(`- App on port 3002: ${extHttp.trim() === '200' ? '✓ RUNNING' : '✗ DOWN'}`);
    console.log(`- Nginx HTTP via IP: ${ipHttp.trim() === '200' ? '✓ OK' : '✗ FAIL'}`);
    console.log(`- Nginx HTTPS via IP: ${ipHttps.trim() === '200' ? '✓ OK' : '✗ FAIL'}`);
    console.log(`- Page served: ${pageContent.trim()}`);
    console.log(`\n⚠️  DNS: xanvyorrecon.id points to 2.57.91.91 (needs to be 76.13.198.125)`);
    console.log(`\nAccess via IP: http://76.13.198.125`);

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
