import { Client } from 'ssh2';
const HOST = '76.13.198.125', USER = 'root', PASS = '753951Ucup##';
function ssh(cmd: string, timeout = 60000): Promise<string> {
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
  // Stop service
  await ssh('systemctl stop xanvyor-recon 2>/dev/null; kill -9 $(lsof -ti:3002) 2>/dev/null; sleep 2');
  
  // Run the server with full stack trace
  console.log('Running server with NODE_OPTIONS=--enable-source-maps...');
  const output = await ssh(`cd /home/xanvyor-recon && NODE_OPTIONS='--enable-source-maps' DATABASE_URL=file:/home/xanvyor-recon/db/custom.db node node_modules/next/dist/bin/next start -p 3002 2>&1 & sleep 10 && curl -s http://localhost:3002 > /dev/null 2>&1; sleep 5; kill %1 2>/dev/null`, 30000);
  console.log(output);
  
  // Also check the .next/required-server-files.json
  console.log('\n=== required-server-files.json ===');
  const rsf = await ssh('cat /home/xanvyor-recon/.next/required-server-files.json 2>/dev/null | head -30');
  console.log(rsf);
  
  // Check if lucide-react is installed
  console.log('\n=== lucide-react ===');
  console.log(await ssh('ls /home/xanvyor-recon/node_modules/lucide-react/dist/esm/icons/ 2>/dev/null | grep -E "bitcoin|user-search|radio" | head -5 || echo "checking cjs..."'));
  console.log(await ssh('ls /home/xanvyor-recon/node_modules/lucide-react/dist/cjs/icons/ 2>/dev/null | grep -E "bitcoin|user-search|radio" | head -5 || echo "not found"'));
  console.log(await ssh('cat /home/xanvyor-recon/node_modules/lucide-react/package.json 2>/dev/null | grep version | head -1'));
}

main().catch(console.error);
