// CommonJS signer (R2 + Vercel)
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,          // e.g. https://<accountid>.r2.cloudflarestorage.com
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
});

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).end();

    const {
      // we accept these but we won't bind ContentType in the signature
      contentType = "application/octet-stream",
      ext = "webm",
      kind = "raw",
      userId = "anon"
    } = req.body || {};

    const id = randomUUID();
    const Key = `recordings/${userId}/${id}_${kind}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key,
      // DO NOT include ContentType here; keep the signature header-less
      ServerSideEncryption: "AES256"
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    return res.json({ url, key: Key, id });
  } catch (e) {
    console.error("sign-upload error:", e);
    return res.status(500).json({ error: "sign_failed" });
  }
};
