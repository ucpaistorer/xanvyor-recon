import { Client } from 'ssh2';
import { readFileSync, createReadStream } from 'fs';
import { join } from 'path';
import * as zlib from 'zlib';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/var/www/xanvyor-recon';
const DOMAIN = 'xanvyorrecon.id';

function execCommand(conn: Client, cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Command timed out: ${cmd.substring(0, 80)}`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); reject(err); return; }
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.on('close', () => { clearTimeout(timer); resolve(stdout + stderr); });
      stream.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });
    });
  });
}

async function deploy() {
  console.log('🚀 Starting VPS deployment...');
  console.log(`📡 Connecting to ${VPS_HOST}...`);

  const conn = new Client();

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ Connected to VPS!');
      resolve();
    });
    conn.on('error', (err) => {
      console.error('❌ SSH connection failed:', err.message);
      reject(err);
    });
    conn.connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 30000,
    });
  });

  try {
    // Step 1: Check server environment
    console.log('\n📋 Step 1: Checking server environment...');
    const uname = await execCommand(conn, 'uname -a');
    console.log('Server:', uname.trim());

    const nodeCheck = await execCommand(conn, 'which node && node --version || echo "node not found"');
    console.log('Node:', nodeCheck.trim());

    const bunCheck = await execCommand(conn, 'which bun && bun --version || echo "bun not found"');
    console.log('Bun:', bunCheck.trim());

    const nginxCheck = await execCommand(conn, 'which nginx && nginx -v 2>&1 || echo "nginx not found"');
    console.log('Nginx:', nginxCheck.trim());

    const caddyCheck = await execCommand(conn, 'which caddy && caddy version 2>&1 || echo "caddy not found"');
    console.log('Caddy:', caddyCheck.trim());

    // Step 2: Install Node.js if not present
    console.log('\n📦 Step 2: Ensuring Node.js is installed...');
    const nodeVersion = await execCommand(conn, 'node --version 2>/dev/null || echo "none"');
    if (nodeVersion.trim() === 'none' || nodeVersion.trim().startsWith('v1[0-7]')) {
      console.log('Installing Node.js 20...');
      await execCommand(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs', 120000);
      console.log('Node.js installed:', await execCommand(conn, 'node --version'));
    } else {
      console.log('Node.js already installed:', nodeVersion.trim());
    }

    // Install bun if not present
    const bunVersion = await execCommand(conn, 'bun --version 2>/dev/null || echo "none"');
    if (bunVersion.trim() === 'none') {
      console.log('Installing Bun...');
      await execCommand(conn, 'curl -fsSL https://bun.sh/install | bash', 120000);
      await execCommand(conn, 'export PATH="$HOME/.bun/bin:$PATH" && bun --version');
    }

    // Step 3: Create project directory
    console.log('\n📁 Step 3: Setting up project directory...');
    await execCommand(conn, `mkdir -p ${REMOTE_DIR}`);
    await execCommand(conn, `rm -rf ${REMOTE_DIR}/* ${REMOTE_DIR}/.next 2>/dev/null; true`);

    // Step 4: Create tarball of the built project
    console.log('\n📦 Step 4: Preparing deployment package...');

    // Step 5: Transfer files via SFTP
    console.log('\n📤 Step 5: Transferring files to VPS...');

    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) reject(err);
        else resolve(sftp);
      });
    });

    // Upload key files one by one using SFTP
    const filesToUpload = [
      { local: 'package.json', remote: `${REMOTE_DIR}/package.json` },
      { local: 'bun.lock', remote: `${REMOTE_DIR}/bun.lock` },
      { local: 'next.config.ts', remote: `${REMOTE_DIR}/next.config.ts` },
      { local: 'tsconfig.json', remote: `${REMOTE_DIR}/tsconfig.json` },
      { local: 'postcss.config.mjs', remote: `${REMOTE_DIR}/postcss.config.mjs` },
      { local: 'components.json', remote: `${REMOTE_DIR}/components.json` },
      { local: '.env', remote: `${REMOTE_DIR}/.env` },
      { local: 'tailwind.config.ts', remote: `${REMOTE_DIR}/tailwind.config.ts` },
      { local: 'eslint.config.mjs', remote: `${REMOTE_DIR}/eslint.config.mjs` },
    ];

    for (const file of filesToUpload) {
      try {
        const localPath = join('/home/z/my-project', file.local);
        const stat = await new Promise<any>((res, rej) => {
          require('fs').stat(localPath, (e: any, s: any) => e ? rej(e) : res(s));
        });
        if (stat) {
          await new Promise<void>((res, rej) => {
            const readStream = createReadStream(localPath);
            const writeStream = sftp.createWriteStream(file.remote);
            writeStream.on('close', () => res());
            writeStream.on('error', rej);
            readStream.pipe(writeStream);
          });
          console.log(`  ✅ Uploaded: ${file.local}`);
        }
      } catch {
        console.log(`  ⚠️  Skipped: ${file.local}`);
      }
    }

    // Create directories on VPS
    const dirsToCreate = [
      'src/app/api/osint/vehicle', 'src/app/api/osint/phone-location', 'src/app/api/osint/qris',
      'src/app/api/osint/wifi-scan', 'src/app/api/osint/social', 'src/app/api/osint/web-vuln',
      'src/app/api/osint/image-analysis', 'src/app/api/osint/bank', 'src/app/api/osint/nik',
      'src/app/api/osint/ewallet', 'src/app/api/osint/mac', 'src/app/api/osint/ip',
      'src/app/api/osint/subdomain-finder', 'src/app/api/osint/ktp-track', 'src/app/api/osint/phone-device',
      'src/app/api/osint/wifi', 'src/app/api/osint/web-security', 'src/app/api/osint/school',
      'src/app/api/osint/imei', 'src/app/api/osint/username', 'src/app/api/osint/breach-checker',
      'src/app/api/osint/web-search', 'src/app/api/osint/bitcoin', 'src/app/api/osint/ai-chat',
      'src/app/api/osint/domain', 'src/app/api/auth/validate', 'src/app/api/auth/login',
      'src/app/api/osint/phone', 'src/app/api/osint/google-dorking', 'src/app/api/osint/people',
      'src/app/api/osint/dns', 'src/app/api/admin/users', 'src/app/api/admin/keys', 'src/app/api/osint/email',
      'src/app/api', 'src/app', 'src/components/osint', 'src/components/ui', 'src/hooks', 'src/lib',
      'prisma', 'db', 'public',
      '.next/standalone', '.next/static',
    ];

    for (const dir of dirsToCreate) {
      await execCommand(conn, `mkdir -p ${REMOTE_DIR}/${dir}`);
    }

    console.log('  📁 Directories created');

    // Transfer the built standalone app - use tar + scp approach
    // First create a tarball locally
    console.log('\n📦 Creating deployment tarball...');

    conn.end();

    // We'll use a different approach - create a deployment script on VPS
    // and have VPS pull from a temporary file server or use base64 chunks
    console.log('\n💡 Will use alternative deployment method...');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    conn.end();
    process.exit(1);
  }
}

deploy().catch(console.error);
