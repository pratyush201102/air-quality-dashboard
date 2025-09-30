const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const url = process.env.URL || 'http://localhost:3002';
  const out = process.env.OUT || 'screenshot.png';

  // Common macOS Chrome/Chromium locations — adjust if you use a different browser
  const possibleExecutables = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
  ];

  const executablePath = possibleExecutables.find((p) => fs.existsSync(p));
  if (!executablePath) {
    console.error('No Chrome/Chromium executable found. Install Chrome or update the path in scripts/screenshot-core.js');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: out, fullPage: true });
    console.log('Saved', out);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
