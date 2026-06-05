import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const R2_ACCOUNTS = {
  1: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  },
  2: {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID_2,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_2,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY_2,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME_2,
  },
};

async function getBucketSize(accountNumber) {
  const config = R2_ACCOUNTS[accountNumber];
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  let totalSize = 0;
  let isTruncated = true;
  let continuationToken = undefined;

  console.log(`Calculando tamaño real de cuenta #${accountNumber}...`);

  while (isTruncated) {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      ContinuationToken: continuationToken,
    });

    try {
      const response = await client.send(command);
      if (response.Contents) {
        for (const item of response.Contents) {
          totalSize += item.Size || 0;
        }
      }
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    } catch (err) {
      console.error(`Error listando objetos cuenta #${accountNumber}:`, err.message);
      break;
    }
  }

  return totalSize;
}

async function sync() {
  for (const account of [1, 2]) {
    const totalSize = await getBucketSize(account);
    console.log(`Cuenta #${account}: ${(totalSize / 1073741824).toFixed(2)} GB (${totalSize} bytes)`);

    const { error } = await supabase
      .from("storage_buckets")
      .update({ current_usage_bytes: totalSize })
      .eq("account_number", account);

    if (error) {
      console.error(`Error actualizando DB cuenta #${account}:`, error.message);
    } else {
      console.log(`✅ Base de datos actualizada para cuenta #${account}`);
    }
  }
}

sync().catch(console.error);
