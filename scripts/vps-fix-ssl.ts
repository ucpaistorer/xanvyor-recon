import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 120000): Promise<string> {
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
    // Step 1: Create valid self-signed SSL certificate
    console.log('\n[1] Creating self-signed SSL certificate...');
    await exec(`
mkdir -p /etc/ssl/xanvyor
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/xanvyor/key.pem \
  -out /etc/ssl/xanvyor/cert.pem \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=XANVYOR/CN=xanvyorrecon.id" \
  -addext "subjectAltName=DNS:xanvyorrecon.id,DNS:www.xanvyorrecon.id" 2>&1
echo "SSL cert created"
    `);

    // Step 2: Test nginx
    console.log('\n[2] Testing nginx config...');
    const nginxTest = await exec('nginx -t 2>&1');
    console.log(nginxTest);

    // Step 3: Restart nginx
    console.log('\n[3] Restarting nginx...');
    await exec('systemctl restart nginx 2>&1');
    
    // Step 4: Verify service is running
    console.log('\n[4] Checking services...');
    console.log(await exec('systemctl status xanvyor-recon --no-pager | head -10'));
    console.log(await exec('systemctl status nginx --no-pager | head -10'));

    // Step 5: Check app response
    console.log('\n[5] Testing app response...');
    const httpCheck = await exec('curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3002/');
    console.log(`Local HTTP: ${httpCheck.trim()}`);
    
    const httpsCheck = await exec('curl -sk -o /dev/null -w "HTTPS %{http_code}" https://localhost/');
    console.log(`Local HTTPS: ${httpsCheck.trim()}`);

    // Step 6: Check DNS and try certbot
    console.log('\n[6] DNS check...');
    const dns = await exec('dig +short xanvyorrecon.id 2>/dev/null');
    console.log(`DNS: xanvyorrecon.id -> ${dns.trim()}`);
    
    const dns2 = await exec('dig +short www.xanvyorrecon.id 2>/dev/null');
    console.log(`DNS: www.xanvyorrecon.id -> ${dns2.trim()}`);

    // Step 7: Check what page is being served
    console.log('\n[7] Checking served page...');
    const pageTitle = await exec('curl -sk https://localhost/ 2>&1 | grep "<title>" | head -1');
    console.log(`Page title: ${pageTitle.trim()}`);

    // Step 8: Seed the admin API key in the database
    console.log('\n[8] Seeding admin API key...');
    const seedResult = await exec(`
cd /home/xanvyor-recon/.next/standalone
cat > seed-key.js << 'SEED'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check if admin user exists
  let admin = await prisma.user.findFirst({ where: { name: { contains: 'admin' } } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { name: 'Admin', phone: '+6287892614294' }
    });
    console.log('Created admin user:', admin.id);
  } else {
    console.log('Admin user exists:', admin.id);
  }

  // Check if admin key exists
  const existingKey = await prisma.apiKey.findFirst({ where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
  if (!existingKey) {
    const key = await prisma.apiKey.create({
      data: {
        key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
        userId: admin.id,
        plan: 'lifetime',
        label: 'Admin Master Key',
        isActive: true,
        expiresAt: null,
      }
    });
    console.log('Created admin API key:', key.id);
  } else {
    console.log('Admin API key already exists');
  }

  // Also create the user-facing key
  const existingUserKey = await prisma.apiKey.findFirst({ where: { key: 'recon-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
  if (!existingUserKey) {
    const userKey = await prisma.apiKey.create({
      data: {
        key: 'recon-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
        userId: admin.id,
        plan: 'lifetime',
        label: 'User Key',
        isActive: true,
        expiresAt: null,
      }
    });
    console.log('Created user API key:', userKey.id);
  } else {
    console.log('User API key already exists');
  }

  await prisma.\$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
SEED
node seed-key.js 2>&1`);
    console.log(seedResult);

    // Step 9: Try certbot for Let's Encrypt SSL
    console.log('\n[9] Attempting Let\'s Encrypt SSL...');
    const certbotResult = await exec(`
# First check if certbot is installed
which certbot || yum install -y certbot python3-certbot-nginx 2>&1 | tail -5

# Try to get certificate
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect 2>&1 | tail -20
    `, 90000);
    console.log(certbotResult);

    // Step 10: Final verification
    console.log('\n[10] Final verification...');
    console.log(await exec('nginx -t 2>&1'));
    console.log(await exec('systemctl restart nginx 2>&1'));
    
    const finalHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/');
    console.log(`App HTTP: ${finalHttp.trim()}`);
    
    const finalNginxHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost/');
    console.log(`Nginx HTTP: ${finalNginxHttp.trim()}`);
    
    const finalNginxHttps = await exec('curl -sk -o /dev/null -w "%{http_code}" https://localhost/');
    console.log(`Nginx HTTPS: ${finalNginxHttps.trim()}`);

    console.log('\n=== DEPLOYMENT SUMMARY ===');
    console.log(`- App running on port 3002: ${finalHttp.trim() === '200' ? '✓' : '✗'}`);
    console.log(`- Nginx HTTP: ${finalNginxHttp.trim() === '200' ? '✓' : '✗'}`);
    console.log(`- Nginx HTTPS: ${finalNginxHttps.trim() === '200' ? '✓' : '✗'}`);
    console.log(`- DNS: xanvyorrecon.id -> ${dns.trim()}`);
    console.log(`- VPS IP: 76.13.198.125`);
    if (dns.trim() !== '76.13.198.125') {
      console.log(`\n⚠️  DNS WARNING: Domain points to ${dns.trim()} instead of 76.13.198.125`);
      console.log(`   User needs to update DNS A record to point to 76.13.198.125`);
    }

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
