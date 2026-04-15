// scrape-top5.js — run: node pegasas/scrape-top5.js
// Scrapes the "Savaitės TOP" carousel from the homepage and outputs:
//   top5.json       — raw book data
//   top5-seed.js    — paste into Convert.com as a pre-script to pre-seed localStorage
//                     so ALL users (including new ones) see live books immediately
//
// Bright Data Scraping Browser (recommended):
//   BRD_WS_URL=wss://brd-customer-XXXX-zone-YYYY:PASSWORD@brd.superproxy.io:9222 node pegasas/scrape-top5.js
//
// Local Playwright (fallback, no env var needed):
//   node pegasas/scrape-top5.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CACHE_KEY = 'peg-top5-data';

async function scrapeTop5() {
  var browser;

  if (process.env.BRD_WS_URL) {
    console.log('Connecting to Bright Data Scraping Browser...');
    browser = await chromium.connectOverCDP(process.env.BRD_WS_URL);
  } else {
    console.log('Launching local Chromium...');
    browser = await chromium.launch({ headless: true });
  }

  const page = await browser.newPage();

  // Set a realistic viewport so IntersectionObserver fires correctly
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('Loading homepage...');
  await page.goto('https://www.pegasas.lt/', { waitUntil: 'networkidle', timeout: 60000 });

  // Click the "Savaitės TOP" tab
  const tab = page.locator('[role="tab"]').filter({ hasText: 'Savaitės TOP' });
  await tab.waitFor({ timeout: 15000 });
  await tab.click();

  // Get the panel ID, then scroll it into view so React's IntersectionObserver fires
  const panelId = await tab.getAttribute('aria-controls');
  const panel = page.locator('#' + panelId);
  await panel.scrollIntoViewIfNeeded();

  // Wait for React to fetch and render the article cards
  console.log('Waiting for articles to render...');
  await page.waitForSelector('#' + panelId + ' article[data-title]', { timeout: 20000 });
  await page.waitForTimeout(500); // brief settle for all 5 slides

  const books = await page.evaluate(function(panelId) {
    var panel = document.getElementById(panelId);
    if (!panel) throw new Error('Panel not found: ' + panelId);

    var slides = Array.from(panel.querySelectorAll('.slick-slide:not(.slick-cloned)')).slice(0, 5);
    if (slides.length < 5) throw new Error('Only ' + slides.length + ' slides found, expected 5');

    return slides.map(function(slide, i) {
      var article = slide.querySelector('article[data-title]');
      var link = slide.querySelector('a[href]:not([href*="customer"])');

      // Get image URL from React fiber props
      var img = '';
      if (article) {
        var fk = Object.keys(article).find(function(k) { return k.startsWith('__reactFiber'); });
        if (fk) {
          var fiber = article[fk];
          var d = 0;
          while (fiber && d < 30) {
            var p = fiber.memoizedProps;
            if (p) {
              if (p.product && p.product.thumbnail && p.product.thumbnail.url) { img = p.product.thumbnail.url; break; }
              if (p.thumbnail && p.thumbnail.url) { img = p.thumbnail.url; break; }
            }
            fiber = fiber.return;
            d++;
          }
        }
      }
      if (img) {
        var base = img.split('?')[0];
        img = (base.includes('picfit.pegasas.lt') ? base : base.replace('https://www.pegasas.lt', 'https://picfit.pegasas.lt')) + '?op=resize&q=80&w=160';
      }

      return {
        id: i + 1,
        rank: i + 1,
        title: article ? (article.getAttribute('data-title') || '') : '',
        authors: article ? (article.getAttribute('data-authors') || '') : '',
        href: link ? link.getAttribute('href') : '/',
        img: img
      };
    });
  }, panelId);

  await browser.close();

  if (!books || books.length < 5) throw new Error('Expected 5 books, got ' + (books ? books.length : 0));
  if (books.some(function(b) { return !b.title; })) throw new Error('Some books missing title: ' + JSON.stringify(books.map(function(b) { return b.title; })));

  // ── Write top5.json ──
  const jsonPath = path.join(__dirname, 'top5.json');
  fs.writeFileSync(jsonPath, JSON.stringify(books, null, 2));
  console.log('✓ ' + jsonPath);

  // ── Write top5-seed.js ──
  // Paste this into Convert.com as a "pre-script" so localStorage is pre-seeded.
  // Every user who loads the page will get fresh books immediately, with no wait.
  const payload = JSON.stringify({ ts: Date.now(), books });
  const seedJs = [
    '// Auto-generated ' + new Date().toISOString().slice(0, 10) + ' — re-run scrape-top5.js to refresh',
    '// Paste into Convert.com pre-script (runs before the experiment code)',
    'try { localStorage.setItem(' + JSON.stringify(CACHE_KEY) + ', ' + JSON.stringify(payload) + '); } catch(e) {}',
  ].join('\n');

  const seedPath = path.join(__dirname, 'top5-seed.js');
  fs.writeFileSync(seedPath, seedJs);
  console.log('✓ ' + seedPath);

  console.log('\nTop 5:');
  books.forEach(function(b) { console.log('  #' + b.rank + ' ' + b.title + (b.authors ? ' — ' + b.authors : '')); });
  console.log('\nPaste top5-seed.js into Convert.com as a pre-script.');
}

scrapeTop5().catch(function(err) { console.error('Failed:', err.message); process.exit(1); });
