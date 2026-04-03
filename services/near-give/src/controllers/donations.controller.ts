import { Request, Response } from 'express';
import { Donation } from '@nexus-civic/db';
import { verifyItemQuality } from '../utils/itemVerifier';
import { findMatchingNGOs } from '../utils/geoRouter';
import { asyncHandler } from '../middlewares/asyncHandler';

export const createDonation = asyncHandler(async (req: Request, res: Response) => {
  const { itemName, category, description, lat, lng, accuracy, address, s2CellId } = req.body;
  const photoUrls = (req as any).files ? ((req as any).files as any[]).map((f: any) => `/uploads/${f.filename}`) : [];

  // 1. Verify item quality using first uploaded image (if present)
  const firstImage = (req as any).files && ((req as any).files as any[])[0]
    ? ((req as any).files as any[])[0].path
    : null;
  const verificationInfo = firstImage
    ? await verifyItemQuality(firstImage, category)
    : { accepted: true, qualityScore: 50 as number, rejectionReason: undefined as string | undefined };

  const donationDoc = new Donation({
    donorId: req.user ? req.user.id : 'anonymous',
    itemName,
    category,
    description,
    location: {
      lat: Number(lat),
      lng: Number(lng),
      accuracy: accuracy ? Number(accuracy) : undefined,
      address,
      s2CellId
    },
    photoUrls,
    qualityScore: verificationInfo.qualityScore,
    qualityAccepted: verificationInfo.accepted,
    status: verificationInfo.accepted ? 'PENDING' : 'REJECTED'
  });

  // 2. Find matching NGOs if accepted
  if (verificationInfo.accepted) {
    const matchingNGOs = await findMatchingNGOs(donationDoc as any);
    if (matchingNGOs.length > 0) {
      donationDoc.matchedNgoId = matchingNGOs[0]._id.toString();
      donationDoc.status = 'MATCHED';
      
      // Optionally could send notifications here
    }
  }

  await donationDoc.save();

  // Optionally clean up the temp file if not serving from /tmp
  // await fs.unlink(firstImage).catch(console.error);

  res.status(201).json({
    success: true,
    data: donationDoc,
    verificationInfo
  });
});

export const getDonations = asyncHandler(async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.matchedNgoId) filter.matchedNgoId = req.query.matchedNgoId;

  const donations = await Donation.find(filter).sort({ createdAt: -1 }).limit(100);
  res.status(200).json({ success: true, count: donations.length, data: donations });
});

export const getDonation = asyncHandler(async (req: Request, res: Response) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) {
    return res.status(404).json({ success: false, error: 'Donation not found' });
  }
  res.status(200).json({ success: true, data: donation });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  const donation = await Donation.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!donation) {
    return res.status(404).json({ success: false, error: 'Donation not found' });
  }

  res.status(200).json({ success: true, data: donation });
});
