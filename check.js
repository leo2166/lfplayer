const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');

const R2_ACCOUNT_ID = '2e4ce46b69496d4672be6e105ad32329';
const R2_ACCESS_KEY = 'ccd6358464255b0802d99a9dc2104789';
const R2_SECRET_KEY = 'c6e13017eb54138a3bc2c6c2cd37da5dcd748338d1a08f0fa5c13266ca866b11';
const R2_BUCKET = 'lfplayer-almacen-musica';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY }
});

async function check() {
  let isTruncated = true;
  let token = undefined;
  console.log('Searching R2 for Ruben Blades...');
  let found = [];
  while (isTruncated) {
    const res = await s3Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    res.Contents?.forEach(item => {
      if (item.Key.toLowerCase().includes('ruben blades') || item.Key.toLowerCase().includes('amor y control')) {
          found.push(item.Key);
      }
    });
    isTruncated = res.IsTruncated ?? false;
    token = res.NextContinuationToken;
  }
  console.log('Found in R2:', found);

  const supabase = createClient('https://welywltyuhfwkluevgkn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbHl3bHR5dWhmd2tsdWV2Z2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk0NzUwNywiZXhwIjoyMDc5NTIzNTA3fQ.O9-lQyW6w4q7QlyeBvOQTAbIpOG4tm7bN4ODUAXyF48');
  const {data} = await supabase.from('songs').select('blob_url, title').ilike('title', '%Ruben%');
  console.log('Found in DB:', data.map(d => d.blob_url));
}
check().catch(console.error);
