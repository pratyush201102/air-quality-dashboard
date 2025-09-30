const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.URL || 'http://localhost:3002';
  const out = process.env.OUT || 'screenshot.png';

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
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
