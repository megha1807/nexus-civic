import { promises as fs } from 'node:fs';
import path from 'node:path';
import multer from 'multer';

import { createLogger } from './logger';

const logger = createLogger(process.env.SERVICE_NAME ?? 'pulse-report');
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: '/tmp/uploads',
});

function mediaFileFilter(
  _req: Express.Request,
  file: { mimetype: string },
  cb: (error: Error | null, acceptFile?: boolean) => void
): void {
  const isImage = file.mimetype.startsWith('image/');
  const isMp4 = file.mimetype === 'video/mp4';

  if (isImage || isMp4) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image/* and video/mp4 uploads are allowed.'));
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: mediaFileFilter,
});

export const uploadMiddleware = upload.single('media');

type GeminiClientLike = {
  analyzeImage: (
    base64Image: string,
    prompt: string
  ) => Promise<{ accepted: boolean }>;
};

function createGeminiClientSafe(): GeminiClientLike | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const geminiClientModule = require('@nexus-civic/gemini-client') as {
      createGeminiClient?: (key: string) => GeminiClientLike;
    };

    if (typeof geminiClientModule.createGeminiClient === 'function') {
      return geminiClientModule.createGeminiClient(apiKey);
    }
  } catch {
    logger.warn('Gemini client unavailable; image verification will default to true.');
  }

  return null;
}

const gemini = createGeminiClientSafe();

function inferIsVideo(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.mp4';
}

function buildMediaUrl(filePath: string): string {
  const base = process.env.MEDIA_BASE_URL ?? 'http://localhost:3002/uploads';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/${path.basename(filePath)}`;
}

export async function verifyMedia(
  filePath: string,
  category: string
): Promise<{ url: string; verified: boolean }> {
  const url = buildMediaUrl(filePath);

  if (inferIsVideo(filePath)) {
    return { url, verified: true };
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    const base64 = fileBuffer.toString('base64');

    if (!gemini) {
      return { url, verified: true };
    }

    const analysis = await gemini.analyzeImage(
      base64,
      `Verify if this media is relevant to civic grievance category: ${category}`
    );

    return {
      url,
      verified: analysis.accepted,
    };
  } catch (error) {
    logger.warn('Media verification failed; defaulting to verified.', {
      filePath,
      error: error instanceof Error ? error.message : String(error),
    });
    return { url, verified: true };
  }
}
