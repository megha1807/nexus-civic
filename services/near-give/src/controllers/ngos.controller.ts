import { Request, Response } from 'express';
import { NGOProfile } from '@nexus-civic/db';
import { asyncHandler } from '../middlewares/asyncHandler';

export const registerNGO = asyncHandler(async (req: Request, res: Response) => {
  const ngo = await NGOProfile.create(req.body);
  res.status(201).json({ success: true, data: ngo });
});

export const findNearbyNGOs = asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radiusKm, category } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ success: false, error: 'Please provide lat and lng' });
  }

  const radius = radiusKm ? Number(radiusKm) : 10;
  
  const query: any = {
    location: {
      $geoWithin: {
        $centerSphere: [[Number(lng), Number(lat)], radius / 6378.1]
      }
    }
  };

  if (category) {
    query.acceptedCategories = category;
  }

  const ngos = await NGOProfile.find(query);
  res.status(200).json({ success: true, count: ngos.length, data: ngos });
});
