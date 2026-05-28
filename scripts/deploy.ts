import { Client } from 'ssh2';

const HOST = 'xanvyorrecon.id';
const PASSWORDS = ['753951ucup', '753951Ucup##', '753951ucup##'];
const USER = 'root';

async function tryConnect(password: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`✅ Connected with password: ${password.substring(0, 5)}...`);
      resolve(conn);
    }).on('error', (err) => {
      reject(err);
    }).connect({
      host: HOST,
      port: 22,
      username: USER,
      password: password,
      readyTimeout: 15000,
    });
  });
}

function exec(conn: Client, cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream.on('data', (data: Buffer) => { output += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { output += data.toString(); });
      stream.on('close', () => resolve(output));
    });
  });
}

async function main() {
  console.log(`🚀 Deploying XANVYOR RECON to ${HOST}...`);
  
  let conn: Client | null = null;
  for (const pwd of PASSWORDS) {
    try {
      conn = await tryConnect(pwd);
      break;
    } catch (e) {
      console.log(`❌ Password ${pwd.substring(0, 5)}... failed`);
    }
  }
  
  if (!conn) {
    console.error('❌ Could not connect with any password');
    process.exit(1);
  }

  try {
    // Check current state
    console.log('\n📋 Checking server state...');
    let output = await exec(conn, 'uname -a && echo "---" && df -h / && echo "---" && which node && which npm && which bun && echo "---" && ls /var/www/ 2>/dev/null || echo "no /var/www" && echo "---" && ls /root/ 2>/dev/null');
    console.log(output);

    // Check if there's already a project
    output = await exec(conn, 'ls -la /root/xanvyor-recon 2>/dev/null || ls -la /opt/xanvyor-recon 2>/dev/null || echo "No existing project found"');
    console.log('\n📁 Existing project check:', output);

    // Install Node.js if not present
    console.log('\n📦 Installing Node.js & build tools...');
    output = await exec(conn, 'which node || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs)');
    console.log(output.slice(-200));

    // Install bun if not present
    console.log('\n📦 Installing Bun...');
    output = await exec(conn, 'which bun || (curl -fsSL https://bun.sh/install | bash)');
    console.log(output.slice(-200));

    // Create project directory
    console.log('\n📁 Setting up project directory...');
    output = await exec(conn, 'mkdir -p /opt/xanvyor-recon');
    console.log(output);

    // Upload project using git archive and pipe
    console.log('\n📦 Uploading project...');
    
    // We'll create a tarball and upload via SCP-like approach using cat
    // First, let's just rsync or use a simpler approach
    
    conn.end();
    console.log('\n✅ Initial setup complete. Now need to upload project files.');
    
  } catch (error) {
    console.error('Error:', error);
    conn.end();
  }
}

main().catch(console.error);
