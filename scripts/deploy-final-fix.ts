import { Client } from 'ssh2';
const HOST = '76.13.198.125', USER = 'root', PASS = '753951Ucup##';
const DIR = '/home/xanvyor-recon';

function ssh(cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); reject(new Error('Timeout')); }, timeout);
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return; }
        let out = '';
        stream.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
        stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
        stream.on('close', () => { clearTimeout(timer); conn.end(); resolve(out); });
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

async function main() {
  // Step 1: Fix next.config.ts on VPS - remove standalone output
  console.log('⚙️ Fixing next.config.ts on VPS...');
  await ssh(`cat > ${DIR}/next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
EOF
echo "✅ next.config.ts updated"`);
  
  // Step 2: Rebuild on VPS
  console.log('\n🔨 Rebuilding on VPS...');
  const buildResult = await ssh(`cd ${DIR} && DATABASE_URL=file:${DIR}/db/custom.db npx next build 2>&1 | tail -10`, 600000);
  console.log('Build:', buildResult.trim());
  
  // Step 3: Restart service
  console.log('\n🔄 Restarting service...');
  await ssh('systemctl restart xanvyor-recon; sleep 8');
  
  const status = await ssh('systemctl is-active xanvyor-recon 2>/dev/null');
  console.log('Service:', status.trim());
  
  if (status.trim() === 'active') {
    const http = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
    console.log('HTTP:', http.trim());
    
    const api = await ssh(`curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('API:', api.trim().substring(0, 100));
  }
  
  // Step 4: Fix DNS - the domain currently points to 2.57.91.91, not 76.13.198.125
  console.log('\n🌐 DNS Check...');
  const dns = await ssh('dig +short xanvyorrecon.id 2>/dev/null || echo "no dig"');
  console.log('Current DNS:', dns.trim());
  console.log('Expected IP: 76.13.198.125');
  
  // Step 5: Fix Nginx for SSL with certbot
  console.log('\n🔒 Setting up SSL...');
  
  // Check if we can use acme.sh which is already installed
  const acmeCheck = await ssh('ls /root/.acme.sh/acme.sh 2>/dev/null && echo "ACME_EXISTS" || echo "NO_ACME"');
  console.log('acme.sh:', acmeCheck.trim());
  
  if (acmeCheck.includes('ACME_EXISTS')) {
    console.log('Using acme.sh for SSL...');
    const sslResult = await ssh(`/root/.acme.sh/acme.sh --issue -d xanvyorrecon.id -d www.xanvyorrecon.id --nginx 2>&1 | tail -15`, 120000);
    console.log('SSL Issue:', sslResult);
    
    // Install cert
    await ssh(`mkdir -p /etc/ssl/xanvyor && /root/.acme.sh/acme.sh --install-cert -d xanvyorrecon.id --key-file /etc/ssl/xanvyor/key.pem --fullchain-file /etc/ssl/xanvyor/cert.pem --reloadcmd "systemctl reload nginx" 2>&1 | tail -10`, 60000);
  }
  
  // Try certbot as alternative
  console.log('\nTrying certbot...');
  const certbotResult = await ssh('certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>&1 | tail -10', 120000);
  console.log('Certbot:', certbotResult);
  
  // Step 6: Reload nginx
  await ssh('nginx -t 2>&1 && systemctl reload nginx 2>&1 && echo "✅ Nginx reloaded"');
  
  // Step 7: Final verification
  console.log('\n✅ Final Verification...');
  const httpLocal = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
  const httpsLocal = await ssh('curl -sk -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null || echo "NO_HTTPS"');
  console.log('HTTP (local):', httpLocal.trim());
  console.log('HTTPS (local):', httpsLocal.trim());
  
  // Check external
  const extHttp = await ssh('curl -s -o /dev/null -w "%{http_code}" http://xanvyorrecon.id 2>/dev/null || echo "FAIL"');
  const extHttps = await ssh('curl -sk -o /dev/null -w "%{http_code}" https://xanvyorrecon.id 2>/dev/null || echo "FAIL"');
  console.log('HTTP (domain):', extHttp.trim());
  console.log('HTTPS (domain):', extHttps.trim());
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 DEPLOYMENT STATUS');
  console.log('='.repeat(50));
  console.log(`🌐 HTTP: http://xanvyorrecon.id (HTTP ${extHttp.trim()})`);
  console.log(`🔒 HTTPS: https://xanvyorrecon.id (HTTPS ${extHttps.trim()})`);
  console.log(`🔑 API Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
  console.log(`👑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
  console.log(`📡 Port: 3002`);
  console.log(`📁 Path: ${DIR}`);
  
  if (dns.trim() !== '76.13.198.125') {
    console.log(`\n⚠️  DNS WARNING: xanvyorrecon.id points to ${dns.trim()} instead of 76.13.198.125`);
    console.log('   Please update DNS A record to point to 76.13.198.125');
  }
}

main().catch(console.error);
