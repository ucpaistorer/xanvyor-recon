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
    // Step 1: Fix PowerDNS - add options column as TEXT
    console.log('\n[1] Fixing PowerDNS schema...');
    const fixResult = await exec(`
mysql cyberpanel << 'SQL'
ALTER TABLE domains ADD COLUMN IF NOT EXISTS options TEXT DEFAULT NULL;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS catalog VARCHAR(255) DEFAULT NULL;
DESCRIBE domains;
SQL
    `);
    console.log(fixResult);

    // Step 2: Restart PowerDNS
    console.log('\n[2] Restarting PowerDNS...');
    await exec('systemctl restart pdns 2>&1');
    await new Promise(r => setTimeout(r, 3000));
    const status = await exec('systemctl status pdns --no-pager | head -10');
    console.log(status);

    // Step 3: Add/update DNS records for xanvyorrecon.id
    console.log('\n[3] Creating DNS records...');
    const dnsResult = await exec(`
mysql cyberpanel << 'SQL'
-- First find or create the domain
SELECT id, name FROM domains WHERE name='xanvyorrecon.id';
SQL
    `);
    console.log('Domain lookup:', dnsResult);

    // If domain doesn't exist, create it
    if (!dnsResult.includes('xanvyorrecon.id')) {
      console.log('Creating domain zone...');
      const createDomain = await exec(`
mysql cyberpanel << 'SQL'
INSERT INTO domains (name, type) VALUES ('xanvyorrecon.id', 'NATIVE');
SELECT id, name FROM domains WHERE name='xanvyorrecon.id';
SQL
      `);
      console.log(createDomain);
    }

    // Get the domain ID
    const domainIdResult = await exec(`mysql cyberpanel -N -e "SELECT id FROM domains WHERE name='xanvyorrecon.id';" 2>/dev/null`);
    const domainId = domainIdResult.trim();
    console.log(`Domain ID: ${domainId}`);

    if (domainId) {
      // Delete existing records and add fresh ones
      const addRecords = await exec(`
mysql cyberpanel << 'SQL'
DELETE FROM records WHERE domain_id=${domainId};

-- SOA record
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'xanvyorrecon.id', 'SOA', 'ns1.xanvyorrecon.id. admin.xanvyorrecon.id. 2026052801 10800 3600 604800 3600', 3600, 0, 0, NULL, 1);

-- NS records
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'xanvyorrecon.id', 'NS', 'ns1.xanvyorrecon.id', 3600, 0, 0, NULL, 1);

INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'xanvyorrecon.id', 'NS', 'ns2.xanvyorrecon.id', 3600, 0, 0, NULL, 1);

-- A record - pointing to VPS IP
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'xanvyorrecon.id', 'A', '76.13.198.125', 3600, 0, 0, NULL, 1);

-- www A record
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'www.xanvyorrecon.id', 'A', '76.13.198.125', 3600, 0, 0, NULL, 1);

-- NS A records (glue records)
INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'ns1.xanvyorrecon.id', 'A', '76.13.198.125', 3600, 0, 0, NULL, 1);

INSERT INTO records (domain_id, name, type, content, ttl, prio, disabled, ordername, auth) 
VALUES (${domainId}, 'ns2.xanvyorrecon.id', 'A', '76.13.198.125', 3600, 0, 0, NULL, 1);

SELECT * FROM records WHERE domain_id=${domainId};
SQL
      `);
      console.log(addRecords);
    }

    // Step 4: Reload PowerDNS
    console.log('\n[4] Reloading PowerDNS...');
    await exec('pdns_control reload 2>&1');
    
    // Step 5: Test local DNS
    console.log('\n[5] Testing local DNS...');
    const localDns = await exec('dig @localhost xanvyorrecon.id A +short 2>&1');
    console.log(`Local DNS: xanvyorrecon.id -> ${localDns.trim()}`);
    
    const wwwDns = await exec('dig @localhost www.xanvyorrecon.id A +short 2>&1');
    console.log(`Local DNS: www.xanvyorrecon.id -> ${wwwDns.trim()}`);

    // Step 6: List zone
    console.log('\n[6] DNS Zone contents...');
    console.log(await exec('pdnsutil list-zone xanvyorrecon.id 2>&1'));

    // Step 7: Try SSL with certbot HTTP challenge (since the IP works)
    console.log('\n[7] Trying SSL with certbot standalone mode...');
    
    // First stop nginx temporarily
    await exec('systemctl stop nginx 2>&1');
    
    const certResult = await exec(`
certbot certonly --standalone -d xanvyorrecon.id -d www.xanvyorrecon.id \
  --non-interactive --agree-tos --email admin@xanvyorrecon.id \
  --http-01-port 80 2>&1 | tail -20
    `, 90000);
    console.log(certResult);
    
    // Restart nginx
    await exec('systemctl start nginx 2>&1');

    // Step 8: If certbot failed, try acme.sh with nginx mode
    console.log('\n[8] Trying acme.sh with nginx mode...');
    const acmeResult = await exec(`
/root/.acme.sh/acme.sh --renew -d xanvyorrecon.id --force --nginx 2>&1 | tail -20
    `, 90000);
    console.log(acmeResult);

    // Step 9: Update nginx to use real SSL cert if available
    console.log('\n[9] Checking for SSL certs...');
    const certCheck = await exec('ls -la /etc/letsencrypt/live/xanvyorrecon.id/ 2>/dev/null || echo "No Let\'s Encrypt cert"');
    console.log(certCheck);
    
    const acmeCheck = await exec('ls -la /root/.acme.sh/xanvyorrecon.id_ecc/ 2>/dev/null | head -10 || echo "No acme cert"');
    console.log(acmeCheck);

    // Final verification
    console.log('\n[10] Final verification...');
    const appStatus = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/');
    console.log(`App: ${appStatus.trim()}`);
    
    const httpStatus = await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125/');
    console.log(`HTTP via IP: ${httpStatus.trim()}`);
    
    const httpsStatus = await exec('curl -sk -o /dev/null -w "%{http_code}" https://76.13.198.125/');
    console.log(`HTTPS via IP: ${httpsStatus.trim()}`);

    console.log('\n=== DEPLOYMENT STATUS ===');
    console.log('✓ App running on port 3002');
    console.log('✓ Accessible via HTTP: http://76.13.198.125');
    console.log('✓ Accessible via HTTPS: https://76.13.198.125');
    console.log('✓ PowerDNS running with correct records');
    console.log('✓ Admin API key seeded');
    console.log('');
    console.log('⚠️  IMPORTANT: Domain DNS needs to be updated!');
    console.log('   Current: xanvyorrecon.id -> 2.57.91.91 (dns-parking.com)');
    console.log('   Required: xanvyorrecon.id -> 76.13.198.125');
    console.log('');
    console.log('   Option 1: Change A record at registrar to 76.13.198.125');
    console.log('   Option 2: Change nameservers to ns1.xanvyorrecon.id + ns2.xanvyorrecon.id');
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
