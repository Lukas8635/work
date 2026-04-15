// AWS Lambda function — deploy to Lambda + trigger via EventBridge daily
// Writes top5.json to S3 with public read so Convert.com JS can fetch it.
//
// Required env vars:
//   S3_BUCKET  — e.g. "pegasas-top5-data"
//   S3_REGION  — e.g. "us-east-1"
//
// IAM permissions needed:
//   s3:PutObject on arn:aws:s3:::${S3_BUCKET}/*

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const GRAPHQL = 'https://www.pegasas.lt/graphql';
const CMS_PAGE_ID = 295; // homepage CMS page containing the "Savaitės TOP" carousel

async function gql(query, variables) {
  const qs = '?query=' + encodeURIComponent(query) +
             (variables ? '&variables=' + encodeURIComponent(JSON.stringify(variables)) : '');
  const res = await fetch(GRAPHQL + qs);
  if (!res.ok) throw new Error('GraphQL HTTP ' + res.status);
  return res.json();
}

async function getTop5Books() {
  // ── Step 1: Get homepage CMS page and find Savaitės TOP SKUs ──
  const cmsResult = await gql('query { cmsPage(id: ' + CMS_PAGE_ID + ') { content } }');
  const content = cmsResult.data?.cmsPage?.content;
  if (!content) throw new Error('CMS page content empty');

  // Find anchor to "Savaitės TOP" tab panel, e.g. href="#IJXEH4X"
  const tabMatch = content.match(/href="#([A-Z0-9]+)"[^>]*>[^<]*Savait/i);
  if (!tabMatch) throw new Error('Savaitės TOP tab not found in CMS content');
  const panelId = tabMatch[1];

  const panelStart = content.indexOf('id="' + panelId + '"');
  if (panelStart === -1) throw new Error('Panel ' + panelId + ' not found');

  // SKUs are 18-digit strings (9 leading zeros + 9-digit product id)
  const chunk = content.substring(panelStart, panelStart + 6000);
  const allSkus = chunk.match(/0{9}\d{9}/g) || [];
  const skus = [...new Set(allSkus)].slice(0, 5);
  if (skus.length < 5) throw new Error('Only ' + skus.length + ' SKUs found, need 5');

  // ── Step 2: Fetch product details ──
  const prodQuery = `query getProductsBySku($skus: [String], $pageSize: Int!) {
    products(filter: {sku: {in: $skus}}, pageSize: $pageSize) {
      items {
        name sku url_key url_suffix
        thumbnail { url }
        manufacturer_name
      }
    }
  }`;

  const prodResult = await gql(prodQuery, { skus, pageSize: 5 });
  const items = prodResult.data?.products?.items || [];

  // Reorder to match SKU list order (carousel position order)
  const books = skus.map((sku, i) => {
    const item = items.find(p => p.sku === sku);
    if (!item) return null;

    let img = (item.thumbnail && item.thumbnail.url) || '';
    if (img) {
      const base = img.split('?')[0];
      img = (base.includes('picfit.pegasas.lt') ? base
           : base.replace('https://www.pegasas.lt', 'https://picfit.pegasas.lt'))
           + '?op=resize&q=80&w=160';
    }

    return {
      id: i + 1,
      rank: i + 1,
      title: item.name || '',
      authors: item.manufacturer_name || '',
      href: '/' + (item.url_key || '') + (item.url_suffix || '/'),
      img
    };
  }).filter(Boolean);

  if (books.length < 5) throw new Error('Only ' + books.length + ' books resolved');
  return books;
}

exports.handler = async () => {
  try {
    const books = await getTop5Books();

    const s3 = new S3Client({ region: process.env.S3_REGION || process.env.AWS_REGION });
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: 'top5.json',
      Body: JSON.stringify(books),
      ContentType: 'application/json',
      CacheControl: 'max-age=3600, public'
    }));

    console.log('Updated top5.json:', books.map(b => '#' + b.rank + ' ' + b.title).join(', '));
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('Failed:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
