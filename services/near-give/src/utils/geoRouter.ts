

import { NGOProfile } from '@nexus-civic/db';

export const findMatchingNGOs = async (donation: any) => {
  const donationLat = Number(donation.location?.lat);
  const donationLng = Number(donation.location?.lng);
  const radiusMeters = 10_000;

  let nearbyNGOs: any[] = [];
  try {
    nearbyNGOs = await NGOProfile.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [donationLng, donationLat] },
          $maxDistance: radiusMeters,
        },
      },
      acceptedCategories: donation.category,
      $expr: { $lt: ['$currentLoad', '$maxCapacity'] },
    }).lean();
  } catch {
    // Fallback for schemas without a native GeoJSON location field.
    nearbyNGOs = await NGOProfile.find({
      acceptedCategories: donation.category,
      $expr: { $lt: ['$currentLoad', '$maxCapacity'] },
    }).lean();
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const scored = nearbyNGOs
    .map((ngo: any) => {
      const distanceKm = haversineKm(donationLat, donationLng, ngo.location.lat, ngo.location.lng);
      if (distanceKm > 10) {
        return null;
      }

      const safeDistance = distanceKm === 0 ? 0.001 : distanceKm;
      const capacityRatio = ngo.maxCapacity > 0 ? ngo.currentLoad / ngo.maxCapacity : 1;
      const score =
        (1 / safeDistance) * 0.5 +
        (1 - capacityRatio) * 0.3 +
        ((ngo.rating || 0) / 5) * 0.2;

      return { ngo, score };
    })
    .filter((entry): entry is { ngo: any; score: number } => Boolean(entry));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.ngo);
};
