import { Client } from "minio";

// ── MinIO client ──────────────────────────────────────────────────────────────
export const minioClient = new Client({
  endPoint:  process.env.MINIO_ENDPOINT  || "minio",
  port:      Number(process.env.MINIO_PORT) || 9000,
  useSSL:    process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET = process.env.MINIO_BUCKET || "invoicehive";

// ── Ensure bucket exists on startup ───────────────────────────────────────────
export const initMinio = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET);
    if (!exists) {
      await minioClient.makeBucket(BUCKET, "us-east-1");
      console.log(`✅ MinIO bucket created: ${BUCKET}`);
    } else {
      console.log(`✅ MinIO connected — bucket: ${BUCKET}`);
    }
  } catch (err) {
    console.error("❌ MinIO init failed:", err.message);
    // Don't exit — service can run without MinIO, PDFs just won't save
  }
};

// ── Upload PDF buffer to MinIO ─────────────────────────────────────────────────
// Returns the public URL of the stored PDF
export const uploadPDF = async (userId, invoiceId, pdfBuffer) => {
  const objectName = `invoices/${userId}/${invoiceId}.pdf`;

  await minioClient.putObject(BUCKET, objectName, pdfBuffer, pdfBuffer.length, {
    "Content-Type": "application/pdf",
  });

  // Construct public URL
  return `${process.env.STORAGE_PUBLIC_URL}/${objectName}`;
};

// ── Delete PDF from MinIO ─────────────────────────────────────────────────────
export const deletePDF = async (userId, invoiceId) => {
  try {
    const objectName = `invoices/${userId}/${invoiceId}.pdf`;
    await minioClient.removeObject(BUCKET, objectName);
  } catch (err) {
    // Don't throw — PDF might not exist yet (draft invoice)
    console.warn("MinIO delete skipped:", err.message);
  }
};

// ── Generate presigned URL (for private download) ─────────────────────────────
// Expires in 1 hour — use this for secure download links
export const getPresignedUrl = async (userId, invoiceId) => {

  const objectName = `invoices/${userId}/${invoiceId}.pdf`;

  const publicMinioClient = new Client({
    endPoint: process.env.MINIO_PUBLIC_ENDPOINT || "localhost",
    port: Number(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    region: "us-east-1"
  });

  return publicMinioClient.presignedGetObject(
    BUCKET,
    objectName,
    60 * 60
  );
};