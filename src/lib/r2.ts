import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "mtstudys-1106";
export const R2_PUBLIC_URL = (process.env.CLOUDFLARE_R2_PUBLIC_URL || "").replace(/\/$/, "");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

export async function uploadToR2(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ fileUrl: string; key: string; fileSize: number }> {
  const ext = params.fileName.includes(".") ? params.fileName.split(".").pop() : "pdf";
  const safeName = params.fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const uniqueKey = `${params.folder ? params.folder + "/" : "materials/"}${Date.now()}-${safeName}.${ext}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      Body: params.buffer,
      ContentType: params.contentType,
    })
  );

  const fileUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${uniqueKey}`
    : `https://${R2_BUCKET_NAME}.r2.dev/${uniqueKey}`;

  return {
    fileUrl,
    key: uniqueKey,
    fileSize: params.buffer.length,
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

