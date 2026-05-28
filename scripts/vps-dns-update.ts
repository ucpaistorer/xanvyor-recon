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
    // Check CyberPanel CLI
    console.log('\n[1] CyberPanel CLI...');
    console.log(await exec('cyberpanel --help 2>&1 | head -30'));

    // Check DNS via CyberPanel
    console.log('\n[2] Checking DNS zones via CyberPanel...');
    console.log(await exec('cyberpanel listDNSZones 2>&1 || echo "Command failed"'));

    // Try to get DNS records for xanvyorrecon.id
    console.log('\n[3] DNS records for xanvyorrecon.id...');
    console.log(await exec('cyberpanel getDNSRecords --domainName xanvyorrecon.id 2>&1 || echo "Command failed"'));

    // Check PowerDNS config
    console.log('\n[4] PowerDNS config...');
    console.log(await exec('cat /etc/pdns/pdns.conf 2>/dev/null | head -30 || echo "No pdns.conf"'));

    // Check PowerDNS database for DNS records
    console.log('\n[5] Checking PowerDNS database...');
    console.log(await exec('mysql cyberpanel -e "SELECT * FROM dns_records WHERE domain_id IN (SELECT id FROM domains WHERE name=\'xanvyorrecon.id\');" 2>/dev/null || echo "Query failed"'));
    
    // Also try direct MySQL query
    console.log('\n[6] Checking DNS tables...');
    console.log(await exec('mysql cyberpanel -e "SHOW TABLES LIKE \'%dns%\';" 2>/dev/null || echo "No DNS tables"'));
    console.log(await exec('mysql cyberpanel -e "SELECT id,name FROM domains WHERE name LIKE \'%xanvyor%\';" 2>/dev/null || echo "No domains table"'));

    // Try pdnsutil
    console.log('\n[7] Using pdnsutil...');
    console.log(await exec('pdnsutil list-all-zones 2>&1 | head -20'));
    console.log(await exec('pdnsutil list-zone xanvyorrecon.id 2>&1 | head -30'));

    // Try to fix PowerDNS
    console.log('\n[8] Checking PowerDNS status...');
    console.log(await exec('systemctl status pdns --no-pager | head -15'));
    console.log(await exec('journalctl -u pdns --no-pager -n 20 2>&1'));

    // Try to restart PowerDNS
    console.log('\n[9] Restarting PowerDNS...');
    console.log(await exec('systemctl restart pdns 2>&1'));
    await new Promise(r => setTimeout(r, 3000));
    console.log(await exec('systemctl status pdns --no-pager | head -10'));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
