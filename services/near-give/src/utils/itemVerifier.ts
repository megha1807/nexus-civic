import fs from 'fs/promises';
import { createGeminiClient } from '@nexus-civic/gemini-client';

const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

export const verifyItemQuality = async (imagePath: string, category: string) => {
  try {
    const fileBuffer = await fs.readFile(imagePath);
    const base64Image = fileBuffer.toString('base64');
    const prompt = `Is this ${category} in acceptable condition for donation?`;

    const result = await gemini.analyzeImage(base64Image, prompt);

    // Map severity to qualityScore (assuming 1 is low damage / best condition, 5 is high damage)
    // severity 1 -> 100, 2 -> 80, 3 -> 60, 4 -> 40, 5 -> 20
    const qualityScore = (6 - result.severity) * 20;
    
    return {
      accepted: result.accepted,
      qualityScore,
      rejectionReason: !result.accepted && result.findings.length > 0 ? result.findings.join(', ') : undefined,
    };
  } catch (err) {
    console.error("Gemini Verification Error", err);
    return { accepted: true, qualityScore: 50 }; // Fallback
  }
};
