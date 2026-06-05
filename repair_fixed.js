const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Config
const SUPABASE_URL = 'https://welywltyuhfwkluevgkn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbHl3bHR5dWhmd2tsdWV2Z2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk0NzUwNywiZXhwIjoyMDc5NTIzNTA3fQ.O9-lQyW6w4q7QlyeBvOQTAbIpOG4tm7bN4ODUAXyF48';

const R2_ACCOUNT_ID = '2e4ce46b69496d4672be6e105ad32329';
const R2_ACCESS_KEY = 'ccd6358464255b0802d99a9dc2104789';
const R2_SECRET_KEY = 'c6e13017eb54138a3bc2c6c2cd37da5dcd748338d1a08f0fa5c13266ca866b11';
const R2_BUCKET = 'lfplayer-almacen-musica';
const PUBLIC_URL = 'https://pub-9aa79c86fd3a40eba66854524815a9be.r2.dev';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY }
});

async function repair() {
  console.log("Loading S3 keys...");
  let isTruncated = true;
  let token = undefined;
  const s3NameMap = new Map();

  while (isTruncated) {
    const res = await s3Client.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    res.Contents?.forEach(item => {
      const key = item.Key;
      let filename = key;
      // Normal UUID approach
      if (key.length > 37 && key[36] === '-') {
        filename = key.substring(37);
      } else {
        // Fallback for weird keys
        filename = key.split('-').pop(); 
      }
      if (!s3NameMap.has(filename)) s3NameMap.set(filename, key);
    });
    isTruncated = res.IsTruncated ?? false;
    token = res.NextContinuationToken;
  }
  
  console.log(`Loaded ${s3NameMap.size} unique filenames from R2.`);

  const { data: songs, error } = await supabase.from('songs').select('id, blob_url');
  if (error) { console.error(error); return; }

  console.log(`Checking ${songs.length} songs...`);

  let updates = [];
  let found = 0;

  for (const song of songs) {
    if (!song.blob_url) continue;

    // Correctly extract key from ANY URL (worker, old dev, r2.dev)
    const urlParts = song.blob_url.split('/');
    const fullKey = urlParts[urlParts.length - 1]; // last part is the UUID-filename
    
    let decodedFullKey = '';
    try { decodedFullKey = decodeURIComponent(fullKey); } catch(e) { decodedFullKey = fullKey; }

    let dbFilename = decodedFullKey;
    if (decodedFullKey.length > 37 && decodedFullKey[36] === '-') {
      dbFilename = decodedFullKey.substring(37);
    } else {
      // Try to find the last part after the last dash
      const parts = decodedFullKey.split('-');
      if (parts.length > 1) dbFilename = parts.pop();
    }

    // Attempt to match by filename
    const matchedS3Key = s3NameMap.get(dbFilename) || 
                         s3NameMap.get(decodedFullKey) || 
                         s3NameMap.get(fullKey) ||
                         // Deep search in name map if exact match fails
                         [...s3NameMap.keys()].find(k => decodedFullKey.endsWith(k));

    if (matchedS3Key) {
      const correctUrl = `${PUBLIC_URL}/${matchedS3Key}`;
      if (correctUrl !== song.blob_url) {
        updates.push({ id: song.id, correctUrl });
      }
      found++;
    }
  }
  
  console.log(`Matched: ${found}. Needs update: ${updates.length}`);

  // Batch update
  let updatedCount = 0;
  const chunkSize = 100;
  for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      const promises = chunk.map(u => supabase.from('songs').update({ blob_url: u.correctUrl }).eq('id', u.id));
      await Promise.all(promises);
      updatedCount += chunk.length;
      console.log(`Fixed ${updatedCount} links...`);
  }

  console.log(`\n=== REPAIR REPORT ===`);
  console.log(`Correctly Re-linked: ${updatedCount}`);
}

repair().catch(console.error);
