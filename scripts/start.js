#!/usr/bin/env node
const { spawn } = require('child_process');

(async () => {
  const chalk = (await import('chalk')).default;

  console.log(chalk.cyan.bold('\n=== Air Quality Dashboard — Dev Server ===\n'));
  console.log(chalk.green('Starting frontend (React) with live reload...'));
  console.log(chalk.gray('Local: http://localhost:3001'));
  console.log('');

  const proc = spawn('react-scripts', ['start'], { stdio: 'inherit', shell: true });

  proc.on('close', (code) => {
    console.log(`react-scripts exited with code ${code}`);
    process.exit(code);
  });
})();
