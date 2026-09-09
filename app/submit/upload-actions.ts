'use server';

import crypto from 'crypto';

/**
 * Generates a Cloudinary signed-upload signature so the browser can upload
 * images directly to Cloudinary (the API secret never leaves the server).
 */
export async function getUploadSignature(): Promise<{
  ok: boolean;
  timestamp?: number;
  signature?: string;
  apiKey?: string;
  cloudName?: string;
  folder?: string;
  error?: string;
}> {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!apiKey || !apiSecret || !cloudName) {
    return { ok: false, error: 'Image uploads are not configured.' };
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'citybee/submissions';
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

  return { ok: true, timestamp, signature, apiKey, cloudName, folder };
}
