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
    // Check if CyberPanel can manage DNS
    console.log('\n[1] Checking DNS management tools...');
    console.log(await exec('which cyberpanel 2>/dev/null || echo "No CyberPanel CLI"'));
    console.log(await exec('ls -la /usr/local/CyberCP/ 2>/dev/null | head -5 || echo "No CyberPanel"'));
    
    // Check DNS zones
    console.log('\n[2] Checking DNS zones...');
    console.log(await exec('find / -name "*.zone" -path "*xanvyor*" 2>/dev/null | head -5'));
    console.log(await exec('find / -name "named*" -type d 2>/dev/null | head -5'));
    console.log(await exec('cat /etc/named.conf 2>/dev/null | head -20 || echo "No BIND"'));
    console.log(await exec('systemctl status named 2>/dev/null | head -5 || echo "No named service"'));
    
    // Check PowerDNS
    console.log('\n[3] Checking PowerDNS...');
    console.log(await exec('systemctl status pdns 2>/dev/null | head -5 || echo "No PowerDNS"'));
    console.log(await exec('which pdnsutil 2>/dev/null || echo "No pdnsutil"'));
    
    // Check CyberPanel DNS
    console.log('\n[4] Checking CyberPanel DNS settings...');
    console.log(await exec('find /usr/local/CyberCP -name "*.py" -path "*dns*" 2>/dev/null | head -10'));
    console.log(await exec('ls /usr/local/CyberCP/CyberCP/dns/ 2>/dev/null | head -10'));
    
    // Try to update DNS via CyberPanel
    console.log('\n[5] Looking for DNS records...');
    console.log(await exec('find / -path "*xanvyor*" -name "*.db" 2>/dev/null | head -10'));
    console.log(await exec('find / -path "*xanvyor*" -name "*.zone" 2>/dev/null | head -10'));
    console.log(await exec('find /var/named -name "*xanvyor*" 2>/dev/null | head -5 || echo "Not found in /var/named"'));
    
    // Check if we can modify DNS via CyberPanel API or CLI
    console.log('\n[6] CyberPanel CLI for DNS...');
    const cpCheck = await exec('cyberpanel help 2>/dev/null | head -20 || echo "No CLI"');
    console.log(cpCheck);
    
    // Check if there's a DNS record in the database
    console.log('\n[7] Checking DNS databases...');
    console.log(await exec('find /usr/local/CyberCP -name "*.db" 2>/dev/null | head -5'));
    console.log(await exec('ls /usr/local/CyberCP/CyberCP/ 2>/dev/null | head -10'));
    
    // Try direct DNS zone file editing
    console.log('\n[8] Looking for zone files...');
    console.log(await exec('find / -name "xanvyorrecon.id*" -type f 2>/dev/null | head -10'));
    console.log(await exec('ls /var/named/chroot/var/named/ 2>/dev/null | grep xanvyor || echo "Not found"'));
    
    // Try to check the DNS record via CyberPanel's database
    console.log('\n[9] Checking CyberPanel database for DNS...');
    console.log(await exec('mysql -e "SHOW DATABASES;" 2>/dev/null || echo "No MySQL CLI"'));
    console.log(await exec('cat /usr/local/CyberCP/CyberCP/settings.py 2>/dev/null | grep -i database | head -5 || echo "No settings"'));
    
    // Let's also check if 2.57.91.91 is a Cloudflare or DNS proxy IP
    console.log('\n[10] Checking 2.57.91.91...');
    console.log(await exec('curl -sI http://2.57.91.91 --connect-timeout 5 2>&1 | head -10 || echo "Cannot connect"'));
    console.log(await exec('nslookup 2.57.91.91 2>/dev/null | head -5 || echo "No reverse DNS"'));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
