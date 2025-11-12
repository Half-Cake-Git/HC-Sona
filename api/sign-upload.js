// Serverless function: POST /api/sign-upload
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT, // e.g. https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).end(); // 405 means function exists (good)
    const { contentType = "audio/webm", ext = "webm", kind = "raw", userId = "anon" } = req.body || {};
    const id = randomUUID();
    const Key = `recordings/${userId}/${id}_${kind}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key,
      ContentType: contentType,
      ServerSideEncryption: "AES256"
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    res.json({ url, key: Key, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "sign_failed" });
  }
}
