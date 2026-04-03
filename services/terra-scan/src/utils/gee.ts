import axios from 'axios';
import jwt from 'jsonwebtoken';

const GEE_MOCK = process.env.GEE_MOCK !== 'false';
const GEE_SERVICE_ACCOUNT_JSON = process.env.GEE_SERVICE_ACCOUNT_JSON;
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const EARTH_ENGINE_URL = 'https://earthengine.googleapis.com';

/**
 * Helper to calculate a proxy center lat/lng for a given polygon.
 */
function getCenterCoords(polygon: any): { lat: number; lng: number } {
  try {
    const coords = polygon.coordinates[0];
    let latSum = 0, lngSum = 0;
    for (const [lng, lat] of coords) {
      latSum += lat;
      lngSum += lng;
    }
    return {
      lat: latSum / coords.length,
      lng: lngSum / coords.length
    };
  } catch (err) {
    return { lat: 0, lng: 0 };
  }
}

export async function fetchNDVI(polygon: any): Promise<number> {
  if (GEE_MOCK) {
    const { lat } = getCenterCoords(polygon);
    // Rough mock: tropical regions (closer to equator) have higher NDVI
    const normalizedLat = Math.min(Math.abs(lat), 90);
    const base = 0.7 - (normalizedLat / 90) * 0.4; // 0.3 to 0.7
    return Number((base + (Math.random() * 0.1 - 0.05)).toFixed(2));
  }
  // Call real GEE REST API
  return callRealGEEAPI('ndvi', polygon);
}

export async function fetchLST(polygon: any): Promise<number> {
  if (GEE_MOCK) {
    const { lat } = getCenterCoords(polygon);
    // Seasonal approximation by month + latitude tilt.
    const month = new Date().getUTCMonth() + 1;
    const seasonal = 8 * Math.sin(((month - 1) / 12) * 2 * Math.PI);
    const latitudePenalty = Math.min(Math.abs(lat), 60) * 0.12;
    const lst = 33 + seasonal - latitudePenalty + (Math.random() * 4 - 2);
    return Number(Math.max(25, Math.min(45, lst)).toFixed(1));
  }
  return callRealGEEAPI('lst', polygon);
}

export async function fetchFloodExtent(polygon: any): Promise<number> {
  if (GEE_MOCK) {
    // 0-30% random
    return Number((Math.random() * 30).toFixed(1));
  }
  return callRealGEEAPI('flood', polygon);
}

export async function fetchFireHotspots(polygon: any): Promise<number> {
  if (GEE_MOCK) {
    // 0-5 random count
    return Math.floor(Math.random() * 6);
  }
  return callRealGEEAPI('fire', polygon);
}

export async function fetchAQI(polygon: any): Promise<number> {
  if (GEE_MOCK) {
    // 50-200 random
    return Math.floor(50 + Math.random() * 151);
  }
  return callRealGEEAPI('aqi', polygon);
}

async function callRealGEEAPI(layer: string, polygon: any): Promise<number> {
  if (!GEE_SERVICE_ACCOUNT_JSON) {
    console.warn(`[GEE] Real API requested for ${layer} but GEE_SERVICE_ACCOUNT_JSON is missing. Falling back to mock.`);
    return mockFallback(layer);
  }

  try {
    const serviceAccount = JSON.parse(GEE_SERVICE_ACCOUNT_JSON);
    const accessToken = await getGoogleAccessToken(serviceAccount);

    const response = await axios.post(
      `${EARTH_ENGINE_URL}/v1/projects/earthengine-legacy/value:compute`,
      {
        expression: {
          // Minimal expression envelope: runtime can adapt for project-specific assets.
          layer,
          geometry: polygon,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );

    const value = Number(
      response.data?.result ??
      response.data?.value ??
      response.data?.data?.value
    );
    if (Number.isFinite(value)) {
      return value;
    }
    return mockFallback(layer);
  } catch (error) {
    console.error(`[GEE] Error fetching ${layer} data from Earth Engine`, error);
    return mockFallback(layer);
  }
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/earthengine.readonly',
    aud: OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const assertion = jwt.sign(payload, serviceAccount.private_key, { algorithm: 'RS256' });
  const tokenResponse = await axios.post(
    OAUTH_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    }
  );

  if (!tokenResponse.data?.access_token) {
    throw new Error('Failed to obtain Google access token for Earth Engine');
  }

  return tokenResponse.data.access_token;
}

function mockFallback(layer: string): number {
  switch(layer) {
    case 'ndvi': return 0.5;
    case 'lst': return 35.0;
    case 'flood': return 10.0;
    case 'fire': return 2;
    case 'aqi': return 120;
    default: return 0;
  }
}
