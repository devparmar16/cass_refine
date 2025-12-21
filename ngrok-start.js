const { spawn } = require('child_process');

console.log('🚀 Starting ngrok with optimized settings...');

// Optimized ngrok command with performance settings
const ngrok = spawn('ngrok', [
  'http',
  '5173',
  '--log=stdout',
  '--log-level=info',
  '--region=us', // Use US region for better performance
  '--host-header=localhost:5173',
  '--bind-tls=true',
  '--inspect=false' // Disable inspection for better performance
]);

ngrok.stdout.on('data', (data) => {
  console.log(`📡 ngrok: ${data}`);
});

ngrok.stderr.on('data', (data) => {
  console.log(`❌ ngrok error: ${data}`);
});

ngrok.on('close', (code) => {
  console.log(`ngrok process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping ngrok...');
  ngrok.kill('SIGINT');
  process.exit();
}); 