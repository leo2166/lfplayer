const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const R2_ACCOUNT_ID = '2e4ce46b69496d4672be6e105ad32329';
const R2_ACCESS_KEY = 'ccd6358464255b0802d99a9dc2104789';
const R2_SECRET_KEY = 'c6e13017eb54138a3bc2c6c2cd37da5dcd748338d1a08f0fa5c13266ca866b11';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY }
});

async function findNoSpace() {
  const res = await s3Client.send(new ListObjectsV2Command({ Bucket: 'lfplayer-almacen-musica' }));
  const file = res.Contents.find(f => !f.Key.includes(' '));
  console.log('File without spaces:', file?.Key);
}
findNoSpace().catch(console.error);
