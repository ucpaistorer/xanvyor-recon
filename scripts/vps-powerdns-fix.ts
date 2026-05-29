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
    // Step 1: Fix PowerDNS database schema
    console.log('\n[1] Fixing PowerDNS database...');
    
    // Check current domains table structure
    const domainsSchema = await exec('mysql cyberpanel -e "DESCRIBE domains;" 2>/dev/null');
    console.log('Current domains table schema:');
    console.log(domainsSchema);

    // Add missing columns
    console.log('\nAdding missing columns...');
    const addResult = await exec(`
mysql cyberpanel << 'SQL'
ALTER TABLE domains ADD COLUMN IF NOT EXISTS catalog VARCHAR(255) DEFAULT NULL;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS options VARCHAR(65535) DEFAULT NULL;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS account VARCHAR(40) DEFAULT NULL;
DESCRIBE domains;
SQL
    `);
    console.log(addResult);

    // Check records table too
    console.log('\n[2] Checking records table...');
    const recordsSchema = await exec('mysql cyberpanel -e "DESCRIBE records;" 2>/dev/null');
    console.log(recordsSchema);

    // Add missing columns to records if needed
    const addRecords = await exec(`
mysql cyberpanel << 'SQL'
ALTER TABLE records ADD COLUMN IF NOT EXISTS disabled TINYINT(1) DEFAULT 0;
ALTER TABLE records ADD COLUMN IF NOT EXISTS ordername VARCHAR(255) DEFAULT NULL;
ALTER TABLE records ADD COLUMN IF NOT EXISTS auth TINYINT(1) DEFAULT 1;
DESCRIBE records;
SQL
    `);
    console.log(addRecords);

    // Step 3: Restart PowerDNS
    console.log('\n[3] Restarting PowerDNS...');
    await exec('systemctl restart pdns 2>&1');
    await new Promise(r => setTimeout(r, 3000));
    const pdnsStatus = await exec('systemctl status pdns --no-pager | head -10');
    console.log(pdnsStatus);

    if (pdnsStatus.includes('active (running)')) {
      console.log('✓ PowerDNS is now running!');
      
      // Step 4: Update DNS records for xanvyorrecon.id
      console.log('\n[4] Updating DNS records...');
      
      // Check existing records
      const existingRecords = await exec(`mysql cyberpanel -e "SELECT r.* FROM records r JOIN domains d ON r.domain_id=d.id WHERE d.name='xanvyorrecon.id';" 2>/dev/null`);
      console.log('Existing records:', existingRecords);

      // Update A record to point to 76.13.198.125
      const updateResult = await exec(`
mysql cyberpanel << 'SQL'
UPDATE records r JOIN domains d ON r.domain_id=d.id 
SET r.content='76.13.198.125' 
WHERE d.name='xanvyorrecon.id' AND r.type='A';
SELECT r.* FROM records r JOIN domains d ON r.domain_id=d.id WHERE d.name='xanvyorrecon.id';
SQL
      `);
      console.log(updateResult);

      // Also check and update www record
      const wwwUpdate = await exec(`
mysql cyberpanel << 'SQL'
UPDATE records r JOIN domains d ON r.domain_id=d.id 
SET r.content='76.13.198.125' 
WHERE d.name='xanvyorrecon.id' AND r.name='www.xanvyorrecon.id' AND r.type='A';
SQL
      `);
      console.log(wwwUpdate);

      // Verify DNS with pdnsutil
      console.log('\n[5] Verifying DNS zone...');
      const zoneList = await exec('pdnsutil list-zone xanvyorrecon.id 2>&1');
      console.log(zoneList);

      // Notify PowerDNS of changes
      await exec('pdnsutil increase-serial xanvyorrecon.id 2>&1 || echo "Serial update failed"');
      await exec('pdns_control reload 2>&1 || echo "Reload failed"');
    } else {
      console.log('✗ PowerDNS still not running. Checking logs...');
      console.log(await exec('journalctl -u pdns --no-pager -n 20 2>&1'));
    }

    // Step 6: Try SSL with acme.sh (DNS challenge might work)
    console.log('\n[6] Checking acme.sh for SSL...');
    console.log(await exec('ls -la /root/.acme.sh/ 2>/dev/null | head -10'));
    console.log(await exec('cat /root/.acme.sh/xanvyorrecon.id_ecc/xanvyorrecon.id.conf 2>/dev/null | head -20'));
    
    // Try to issue cert via DNS challenge if PowerDNS is running
    if (pdnsStatus.includes('active (running)')) {
      console.log('\n[7] Attempting SSL via acme.sh...');
      const sslResult = await exec(`
/root/.acme.sh/acme.sh --issue -d xanvyorrecon.id -d www.xanvyorrecon.id --dns dns_pdns 2>&1 | tail -30
      `, 90000);
      console.log(sslResult);
    }

    // Step 8: Final DNS check
    console.log('\n[8] Final DNS verification...');
    const dnsCheck = await exec('dig @localhost xanvyorrecon.id A +short 2>/dev/null || echo "Local DNS not responding"');
    console.log(`Local DNS: xanvyorrecon.id -> ${dnsCheck.trim()}`);
    
    const externalDns = await exec('dig @8.8.8.8 xanvyorrecon.id A +short 2>/dev/null || echo "External DNS check failed"');
    console.log(`External DNS (8.8.8.8): xanvyorrecon.id -> ${externalDns.trim()}`);

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
