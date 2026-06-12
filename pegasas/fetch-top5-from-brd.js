// Fetches latest TOP 5 from Bright Data and saves to top5.json
// Used by GitHub Actions — no browser needed.
// Requires env var: BRD_TOKEN

const fs   = require('fs');
const path = require('path');

const TOKEN    = process.env.BRD_TOKEN;
const COLLECTOR = 'c_mnzrm7nk1e73bgwzk2';

async function main() {
  if (!TOKEN) throw new Error('BRD_TOKEN env var missing');

  // 1. Trigger a new collection
  console.log('Triggering Bright Data collection...');
  const triggerResp = await fetch('https://api.brightdata.com/dca/trigger?collector=' + COLLECTOR, {
    method:  'POST',
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body:    '[{}]'
  });
  const triggerData = await triggerResp.json();
  const jobId = triggerData.collection_id || triggerData.id;
  if (!jobId) throw new Error('No job ID returned: ' + JSON.stringify(triggerData));
  console.log('Job ID:', jobId);

  // 2. Poll until data is ready (max 60 sec)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const dataResp = await fetch('https://api.brightdata.com/dca/dataset?id=' + jobId, {
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    const books = await dataResp.json();
    if (Array.isArray(books) && books.length >= 5) {
      const outPath = path.join(__dirname, 'top5.json');
      fs.writeFileSync(outPath, JSON.stringify(books, null, 2));
      console.log('Saved', books.length, 'books:');
      books.forEach((b, i) => console.log('  #' + (i + 1), b.title));

      // Update FALLBACK_BOOKS in pegasas.lt.js
      const jsPath = path.join(__dirname, 'pegasas.lt.js');
      let jsContent = fs.readFileSync(jsPath, 'utf8');
      const entries = books.slice(0, 5).map((b, i) => {
        return [
          '    {',
          '      id: ' + (i + 1) + ',',
          '      title: ' + JSON.stringify(b.title || '') + ',',
          '      authors: ' + JSON.stringify(b.authors || '') + ',',
          '      href: ' + JSON.stringify(b.href || '/') + ',',
          '      img: ' + JSON.stringify(b.img || ''),
          '    }'
        ].join('\n');
      }).join(',\n');
      const newFallback = '  var FALLBACK_BOOKS = [\n' + entries + '\n  ];';
      jsContent = jsContent.replace(/  var FALLBACK_BOOKS = \[[\s\S]*?\n  \];/, newFallback);
      fs.writeFileSync(jsPath, jsContent);
      console.log('✓ Updated FALLBACK_BOOKS in pegasas.lt.js');

      return;
    }
    console.log('Attempt ' + (i + 1) + ' — not ready yet');
  }
  throw new Error('Timeout: data not ready after 60 seconds');
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
