import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || "invoicehive-ikshant";

export const uploadPDF = async (userId, invoiceId, pdfBuffer) => {
  const objectName = `invoices/${userId}/${invoiceId}.pdf`;
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: objectName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
        Metadata: {
          userId,
          invoiceId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );
    if (process.env.CLOUDFRONT_DOMAIN) {
      return `https://${process.env.CLOUDFRONT_DOMAIN}/${objectName}`;
    }
    return `https://${BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${objectName}`;
  } catch (err) {
    console.error("❌ S3 upload failed:", err.message);
    throw err;
  }
};

export const deletePDF = async (userId, invoiceId) => {
  try {
    const objectName = `invoices/${userId}/${invoiceId}.pdf`;
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: objectName,
      })
    );
  } catch (err) {
    console.warn("⚠️ S3 delete skipped:", err.message);
  }
};

export const getPresignedUrl = async (userId, invoiceId) => {
  try {
    const objectName = `invoices/${userId}/${invoiceId}.pdf`;
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: objectName,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (err) {
    console.error("❌ Presigned URL generation failed:", err.message);
    throw err;
  }
};

export const initS3 = async () => {
  try {
    await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 1,
      })
    );
    console.log(`✅ AWS S3 connected — bucket: ${BUCKET}`);
  } catch (err) {
    console.error("❌ S3 init failed:", err.message);
  }
};
