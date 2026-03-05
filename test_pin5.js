const { execSync } = require('child_process');
try {
  const output = execSync('node test_pin4.mjs', { stdio: 'pipe' });
  console.log("OUT::", output.toString());
} catch(e) {
  console.log("ERR::", e.message);
  if (e.stdout) console.log("STDOUT::", e.stdout.toString());
  if (e.stderr) console.log("STDERR::", e.stderr.toString());
}
